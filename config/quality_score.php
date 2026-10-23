<?php
/**
 * We Onboard — Quality Score (QS) Engine & Performance Calculator
 * 
 * Configurable Quality Score Formula:
 * - Scale: 0 to 100 points
 * - Minimum Sample Size: 3 reviewed tasks (less than 3 returns Insufficient Data, score = null)
 * - Weights:
 *   1. Approval Rate (40%)
 *   2. First-Time Right / Low Rework Rate (25%)
 *   3. Timeliness Rate (20%)
 *   4. Evidence & Location Completeness (15%)
 * - Penalties: Confirmed Fraud Flag deductions (-50 pts)
 */

class QualityScoreEngine {

    public static function getConfig(PDO $db): array {
        $defaults = [
            'min_sample_size' => 3.00,
            'weight_approval' => 40.00,
            'weight_rework' => 25.00,
            'weight_timeliness' => 20.00,
            'weight_evidence' => 15.00,
            'penalty_fraud' => 50.00,
            'active_member_min_qs' => 70.00,
            'leader_min_qs' => 85.00,
            'manager_min_qs' => 85.00,
            'leader_min_active_members' => 10.00,
            'manager_min_qualifying_teams' => 3.00
        ];

        try {
            $stmt = $db->query("SELECT config_key, config_value FROM quality_score_config");
            $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            if ($rows) {
                foreach ($rows as $k => $v) {
                    $defaults[$k] = (float)$v;
                }
            }
        } catch (Exception $e) {
            // Table may not exist yet; use safe defaults
        }

        return $defaults;
    }

    public static function calculateFreelancerScore(PDO $db, int $freelancerId): array {
        $config = self::getConfig($db);
        $minSample = (int)$config['min_sample_size'];

        // 1. Fetch freelancer basic info & fraud status
        $flStmt = $db->prepare("SELECT id, full_name, status, onboarding_status, current_rank, fraud_flag, fraud_reason FROM freelancers WHERE id = ? LIMIT 1");
        $flStmt->execute([$freelancerId]);
        $fl = $flStmt->fetch();

        if (!$fl) {
            throw new InvalidArgumentException("Freelancer #{$freelancerId} not found");
        }

        // 2. Query all tasks associated with this freelancer
        $taskStmt = $db->prepare("
            SELECT t.id, t.status, t.deadline, t.submitted_at, t.requires_location, t.rework_count,
                   (SELECT COUNT(*) FROM task_evidence_files f WHERE f.task_id = t.id) as file_count,
                   (SELECT location_lat FROM task_evidence_submissions s WHERE s.task_id = t.id ORDER BY s.id DESC LIMIT 1) as latest_lat
            FROM tasks t
            WHERE t.assigned_freelancer_id = ?
        ");
        $taskStmt->execute([$freelancerId]);
        $tasks = $taskStmt->fetchAll();

        $totalAssigned = count($tasks);
        $reviewedTasks = 0;
        $approvedCount = 0;
        $rejectedCount = 0;
        $reworkCount = 0;
        $firstTimeRightCount = 0;
        $onTimeCount = 0;
        $completeEvidenceCount = 0;
        $submittedCount = 0;

        foreach ($tasks as $t) {
            $status = $t['status'];
            $isSubmitted = in_array($status, ['Submitted', 'Under Review', 'Approved', 'Rework Required', 'Rejected']);
            if ($isSubmitted) {
                $submittedCount++;
            }

            if (in_array($status, ['Approved', 'Rejected', 'Rework Required'])) {
                $reviewedTasks++;
            }

            if ($status === 'Approved') {
                $approvedCount++;
                if ((int)$t['rework_count'] === 0) {
                    $firstTimeRightCount++;
                }
            } elseif ($status === 'Rejected') {
                $rejectedCount++;
            } elseif ($status === 'Rework Required') {
                $reworkCount++;
            }

            // Timeliness: submitted on or before deadline
            if (!empty($t['submitted_at']) && !empty($t['deadline'])) {
                $subDate = substr($t['submitted_at'], 0, 10);
                if ($subDate <= $t['deadline']) {
                    $onTimeCount++;
                }
            }

            // Evidence completeness
            $hasFiles = (int)$t['file_count'] > 0;
            $hasGps = ((int)$t['requires_location'] === 0) || ($t['latest_lat'] !== null);
            if ($hasFiles && $hasGps) {
                $completeEvidenceCount++;
            }
        }

        // 3. Treatment of Insufficient Data (< minSample)
        if ($reviewedTasks < $minSample) {
            $qsStatus = 'Insufficient Data';
            $qualityScore = null;

            // Update database
            $upStmt = $db->prepare("
                UPDATE freelancers 
                SET quality_score = NULL, 
                    qs_sample_size = ?, 
                    qs_status = ?, 
                    qs_last_calculated_at = NOW() 
                WHERE id = ?
            ");
            $upStmt->execute([$reviewedTasks, $qsStatus, $freelancerId]);

            return [
                'freelancer_id' => $freelancerId,
                'full_name' => $fl['full_name'],
                'current_rank' => $fl['current_rank'] ?? 'Trainee',
                'quality_score' => null,
                'qs_status' => $qsStatus,
                'qs_sample_size' => $reviewedTasks,
                'min_sample_size' => $minSample,
                'has_sufficient_data' => false,
                'breakdown' => [
                    'approval_rate' => 0,
                    'approval_points' => 0,
                    'first_time_right_rate' => 0,
                    'first_time_right_points' => 0,
                    'timeliness_rate' => 0,
                    'timeliness_points' => 0,
                    'evidence_completeness_rate' => 0,
                    'evidence_completeness_points' => 0,
                    'fraud_penalty' => 0
                ],
                'task_metrics' => [
                    'total_assigned' => $totalAssigned,
                    'submitted' => $submittedCount,
                    'reviewed' => $reviewedTasks,
                    'approved' => $approvedCount,
                    'rework' => $reworkCount,
                    'rejected' => $rejectedCount
                ],
                'calculated_at' => date('Y-m-d H:i:s')
            ];
        }

        // 4. Calculate Verified Component Rates
        $approvalRate = $reviewedTasks > 0 ? ($approvedCount / $reviewedTasks) : 0;
        $firstTimeRightRate = $approvedCount > 0 ? ($firstTimeRightCount / $approvedCount) : 0;
        $timelinessRate = $submittedCount > 0 ? ($onTimeCount / $submittedCount) : 0;
        $evidenceRate = $submittedCount > 0 ? ($completeEvidenceCount / $submittedCount) : 0;

        $approvalPts = round($approvalRate * $config['weight_approval'], 2);
        $firstTimeRightPts = round($firstTimeRightRate * $config['weight_rework'], 2);
        $timelinessPts = round($timelinessRate * $config['weight_timeliness'], 2);
        $evidencePts = round($evidenceRate * $config['weight_evidence'], 2);

        $fraudPenalty = ((int)$fl['fraud_flag'] === 1) ? $config['penalty_fraud'] : 0.00;

        $subtotal = $approvalPts + $firstTimeRightPts + $timelinessPts + $evidencePts;
        $finalScore = max(0.00, min(100.00, round($subtotal - $fraudPenalty, 2)));

        if ((int)$fl['fraud_flag'] === 1) {
            $qsStatus = 'Suspended';
        } elseif ($finalScore < 50.00) {
            $qsStatus = 'Under Observation';
        } else {
            $qsStatus = 'Active';
        }

        // 5. Update database
        $upStmt = $db->prepare("
            UPDATE freelancers 
            SET quality_score = ?, 
                qs_sample_size = ?, 
                qs_status = ?, 
                qs_last_calculated_at = NOW() 
            WHERE id = ?
        ");
        $upStmt->execute([$finalScore, $reviewedTasks, $qsStatus, $freelancerId]);

        return [
            'freelancer_id' => $freelancerId,
            'full_name' => $fl['full_name'],
            'current_rank' => $fl['current_rank'] ?? 'Trainee',
            'quality_score' => $finalScore,
            'qs_status' => $qsStatus,
            'qs_sample_size' => $reviewedTasks,
            'min_sample_size' => $minSample,
            'has_sufficient_data' => true,
            'breakdown' => [
                'approval_rate' => round($approvalRate * 100, 1),
                'approval_points' => $approvalPts,
                'first_time_right_rate' => round($firstTimeRightRate * 100, 1),
                'first_time_right_points' => $firstTimeRightPts,
                'timeliness_rate' => round($timelinessRate * 100, 1),
                'timeliness_points' => $timelinessPts,
                'evidence_completeness_rate' => round($evidenceRate * 100, 1),
                'evidence_completeness_points' => $evidencePts,
                'fraud_penalty' => $fraudPenalty
            ],
            'task_metrics' => [
                'total_assigned' => $totalAssigned,
                'submitted' => $submittedCount,
                'reviewed' => $reviewedTasks,
                'approved' => $approvedCount,
                'rework' => $reworkCount,
                'rejected' => $rejectedCount
            ],
            'calculated_at' => date('Y-m-d H:i:s')
        ];
    }
}
