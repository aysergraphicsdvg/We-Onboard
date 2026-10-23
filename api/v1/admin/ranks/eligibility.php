<?php
/**
 * We Onboard — Rank Promotion Eligibility Engine API (Phase 6)
 * GET /api/v1/admin/ranks/eligibility.php
 * 
 * Evaluates verified criteria for promotions:
 * - Team Leader: >= 10 active members in team AND QS >= 85 AND no fraud flag
 * - Manager: >= 3 qualifying teams (each >= 10 active members) AND QS >= 85 AND no fraud flag
 * - City/Regional Head: Configurable rules subject to administrative approval
 * 
 * Clearly distinguishes eligibility from approved promotions.
 */

$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    die(json_encode(['success' => false, 'error' => 'System configuration not found']));
}
require_once $root . '/config/config.php';
require_once $root . '/config/cors.php';
require_once $root . '/config/database.php';
require_once $root . '/config/quality_score.php';

header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as an administrator.']);
    exit;
}

try {
    $db = Database::getConnection();
    $config = QualityScoreEngine::getConfig($db);

    $leaderMinQs = (float)$config['leader_min_qs'];
    $managerMinQs = (float)$config['manager_min_qs'];
    $leaderMinActive = (int)$config['leader_min_active_members'];
    $managerMinTeams = (int)$config['manager_min_qualifying_teams'];

    // 1. Fetch active member count per team
    $teamActiveCounts = [];
    $teamStmt = $db->query("
        SELECT tm.team_id, COUNT(DISTINCT f.id) as active_count
        FROM team_members tm
        JOIN freelancers f ON tm.freelancer_id = f.id
        WHERE (f.status = 'Active' OR f.onboarding_status = 'Approved')
          AND f.quality_score >= 70.0
          AND f.fraud_flag = 0
          AND (SELECT COUNT(*) FROM tasks 
               WHERE assigned_freelancer_id = f.id 
                 AND status = 'Approved' 
                 AND reviewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) >= 1
        GROUP BY tm.team_id
    ");
    while ($row = $teamActiveCountsRaw = $teamStmt->fetch()) {
        $teamActiveCounts[(int)$row['team_id']] = (int)$row['active_count'];
    }

    // 2. Query candidates: Freelancers with KYC Approved and no fraud flag
    $candidatesStmt = $db->query("
        SELECT f.id, f.registration_ref, f.full_name, f.email, f.phone, f.city,
               f.current_rank, f.quality_score, f.qs_sample_size, f.qs_status, f.fraud_flag,
               f.team_id, t.name as team_name, t.team_code,
               (SELECT rp.status FROM rank_promotions rp WHERE rp.freelancer_id = f.id ORDER BY rp.id DESC LIMIT 1) as latest_promotion_status
        FROM freelancers f
        LEFT JOIN teams t ON f.team_id = t.id
        WHERE (f.status = 'Active' OR f.onboarding_status = 'Approved')
          AND f.fraud_flag = 0
        ORDER BY f.quality_score DESC, f.id ASC
    ");
    $candidatesRaw = $candidatesStmt->fetchAll();

    $eligibilityList = [];

    foreach ($candidatesRaw as $cand) {
        $flId = (int)$cand['id'];
        $currentRank = $cand['current_rank'] ?: 'Trainee';
        $qs = $cand['quality_score'] !== null ? (float)$cand['quality_score'] : null;

        // Check teams led by this freelancer
        $ledStmt = $db->prepare("SELECT id, name, team_code FROM teams WHERE leader_id = ?");
        $ledStmt->execute([$flId]);
        $ledTeams = $ledStmt->fetchAll();

        $maxActiveMembersInLedTeam = 0;
        foreach ($ledTeams as $lt) {
            $tId = (int)$lt['id'];
            $activeCount = $teamActiveCounts[$tId] ?? 0;
            if ($activeCount > $maxActiveMembersInLedTeam) {
                $maxActiveMembersInLedTeam = $activeCount;
            }
        }

        // Check teams managed by this freelancer
        $managedStmt = $db->prepare("SELECT id, name, team_code FROM teams WHERE manager_id = ?");
        $managedStmt->execute([$flId]);
        $managedTeams = $managedStmt->fetchAll();

        $qualifyingTeamsCount = 0;
        foreach ($managedTeams as $mt) {
            $tId = (int)$mt['id'];
            $activeCount = $teamActiveCounts[$tId] ?? 0;
            if ($activeCount >= 10) {
                $qualifyingTeamsCount++;
            }
        }

        // Determine Promotion Target & Eligibility
        $targetRank = null;
        $isEligible = false;
        $ineligibilityReasons = [];

        if ($currentRank === 'Trainee') {
            $targetRank = 'Team Member';
            // Trainee to Team Member: KYC verified, at least 1 approved task
            $appCount = (int)$db->query("SELECT COUNT(*) FROM tasks WHERE assigned_freelancer_id = {$flId} AND status = 'Approved'")->fetchColumn();
            if ($appCount >= 1) {
                $isEligible = true;
            } else {
                $ineligibilityReasons[] = "Requires at least 1 completed and QC-approved task (current: {$appCount})";
            }
        } elseif ($currentRank === 'Team Member') {
            $targetRank = 'Team Leader';
            $qsMet = ($qs !== null && $qs >= $leaderMinQs);
            $membersMet = ($maxActiveMembersInLedTeam >= $leaderMinActive);

            if ($qsMet && $membersMet) {
                $isEligible = true;
            } else {
                if (!$qsMet) {
                    $ineligibilityReasons[] = "Quality Score must be >= {$leaderMinQs} (current: " . ($qs !== null ? "{$qs}" : "Insufficient Data") . ")";
                }
                if (!$membersMet) {
                    $ineligibilityReasons[] = "Requires leadership of a team with at least {$leaderMinActive} active members (current highest: {$maxActiveMembersInLedTeam})";
                }
            }
        } elseif ($currentRank === 'Team Leader') {
            $targetRank = 'Manager';
            $qsMet = ($qs !== null && $qs >= $managerMinQs);
            $teamsMet = ($qualifyingTeamsCount >= $managerMinTeams);

            if ($qsMet && $teamsMet) {
                $isEligible = true;
            } else {
                if (!$qsMet) {
                    $ineligibilityReasons[] = "Quality Score must be >= {$managerMinQs} (current: " . ($qs !== null ? "{$qs}" : "Insufficient Data") . ")";
                }
                if (!$teamsMet) {
                    $ineligibilityReasons[] = "Requires managing at least {$managerMinTeams} qualifying teams each with >=10 active members (current: {$qualifyingTeamsCount})";
                }
            }
        } elseif ($currentRank === 'Manager') {
            $targetRank = 'City/Regional Head';
            $qsMet = ($qs !== null && $qs >= 85.0);
            if ($qsMet) {
                $isEligible = true;
            } else {
                $ineligibilityReasons[] = "Quality Score must be >= 85.0 (current: " . ($qs !== null ? "{$qs}" : "Insufficient Data") . ")";
            }
        }

        $eligibilityList[] = [
            'freelancerId' => $flId,
            'registrationRef' => $cand['registration_ref'],
            'fullName' => $cand['full_name'],
            'email' => $cand['email'],
            'phone' => $cand['phone'],
            'city' => $cand['city'],
            'currentRank' => $currentRank,
            'targetRank' => $targetRank,
            'qualityScore' => $qs,
            'qsStatus' => $cand['qs_status'] ?: 'Insufficient Data',
            'teamName' => $cand['team_name'],
            'activeMembersInLedTeam' => $maxActiveMembersInLedTeam,
            'qualifyingTeamsCount' => $qualifyingTeamsCount,
            'isEligible' => $isEligible,
            'ineligibilityReasons' => $ineligibilityReasons,
            'latestPromotionStatus' => $cand['latest_promotion_status'] ?: ($isEligible ? 'Eligible' : 'Not Nominated'),
            'thresholds' => [
                'requiredQs' => ($targetRank === 'Team Leader' || $targetRank === 'Manager' || $targetRank === 'City/Regional Head') ? 85.0 : 70.0,
                'requiredActiveMembers' => ($targetRank === 'Team Leader') ? $leaderMinActive : 0,
                'requiredQualifyingTeams' => ($targetRank === 'Manager') ? $managerMinTeams : 0
            ]
        ];
    }

    // Also fetch recent promotion records
    $promStmt = $db->query("
        SELECT rp.*, f.full_name, f.registration_ref, f.city
        FROM rank_promotions rp
        JOIN freelancers f ON rp.freelancer_id = f.id
        ORDER BY rp.id DESC LIMIT 50
    ");
    $promotions = $promStmt->fetchAll();

    echo json_encode([
        'success' => true,
        'candidates' => $eligibilityList,
        'recentPromotions' => $promotions,
        'rules' => [
            'activeMemberDefinition' => 'Valid KYC + QS >= 70 + No Fraud Flag + >=1 Approved Task in preceding 30 days',
            'teamLeaderRequirements' => ">= {$leaderMinActive} Active Members in team + QS >= {$leaderMinQs}",
            'managerRequirements' => ">= {$managerMinTeams} Qualifying Teams (each >=10 active members) + QS >= {$managerMinQs}",
            'cityHeadRequirements' => 'Current Rank Manager + QS >= 85 + Administrative Appointment'
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
