<?php
/**
 * We Onboard — Freelancer Personal Performance & Rank Progress API
 * GET /api/v1/freelancers/performance.php
 * 
 * Secure endpoint for freelancers to inspect their own Quality Score breakdown,
 * rank eligibility progress, team membership, and review feedback.
 */

$rootCandidates = [dirname(__DIR__, 2), dirname(__DIR__, 3), dirname(__DIR__, 1)];
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

if (empty($_SESSION['freelancer_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as a freelancer.']);
    exit;
}

$freelancerId = (int)$_SESSION['freelancer_id'];

try {
    $db = Database::getConnection();

    // 1. Calculate latest verified score breakdown
    $scoreData = QualityScoreEngine::calculateFreelancerScore($db, $freelancerId);

    // 2. Fetch team info
    $teamStmt = $db->prepare("
        SELECT t.id, t.name as team_name, t.team_code, t.city, t.operating_area,
               fl.full_name as leader_name, fl.phone as leader_phone,
               fm.full_name as manager_name,
               tm.role_in_team, tm.joined_at
        FROM team_members tm
        JOIN teams t ON tm.team_id = t.id
        LEFT JOIN freelancers fl ON t.leader_id = fl.id
        LEFT JOIN freelancers fm ON t.manager_id = fm.id
        WHERE tm.freelancer_id = ?
        LIMIT 1
    ");
    $teamStmt->execute([$freelancerId]);
    $teamInfo = $teamStmt->fetch();

    // 3. Fetch past task review history (feedback from reviewers)
    $revStmt = $db->prepare("
        SELECT trh.id, trh.decision, trh.review_comment, trh.reviewed_at,
               t.task_ref, t.title as task_title, p.name as project_name
        FROM task_review_history trh
        JOIN tasks t ON trh.task_id = t.id
        JOIN projects p ON t.project_id = p.id
        WHERE trh.freelancer_id = ?
        ORDER BY trh.id DESC
        LIMIT 20
    ");
    $revStmt->execute([$freelancerId]);
    $reviewHistory = $revStmt->fetchAll();

    // 4. Calculate progress toward next rank
    $currentRank = $scoreData['current_rank'];
    $nextRank = null;
    $rankChecklist = [];

    if ($currentRank === 'Trainee') {
        $nextRank = 'Team Member';
        $approvedCount = (int)$scoreData['task_metrics']['approved'];
        $rankChecklist = [
            [
                'label' => 'KYC Verification Approved',
                'completed' => true,
                'requirement' => 'Admin KYC approval'
            ],
            [
                'label' => 'Complete At Least 1 Field Task',
                'completed' => $approvedCount >= 1,
                'requirement' => '1 task approved by Quality Control (current: ' . $approvedCount . ')'
            ]
        ];
    } elseif ($currentRank === 'Team Member') {
        $nextRank = 'Team Leader';
        $qs = $scoreData['quality_score'] ?? 0;
        $rankChecklist = [
            [
                'label' => 'Quality Score >= 85.0',
                'completed' => ($qs >= 85.0 && $scoreData['has_sufficient_data']),
                'requirement' => 'Verified Quality Score of 85.0+ (current: ' . ($scoreData['has_sufficient_data'] ? $qs : 'Insufficient Data') . ')'
            ],
            [
                'label' => 'Team Active Members >= 10',
                'completed' => false,
                'requirement' => 'Lead an active field team with at least 10 active associates'
            ],
            [
                'label' => 'No Policy or Fraud Flags',
                'completed' => ((int)$scoreData['breakdown']['fraud_penalty'] === 0),
                'requirement' => 'Clean compliance track record'
            ]
        ];
    } elseif ($currentRank === 'Team Leader') {
        $nextRank = 'Manager';
        $qs = $scoreData['quality_score'] ?? 0;
        $rankChecklist = [
            [
                'label' => 'Quality Score >= 85.0',
                'completed' => ($qs >= 85.0 && $scoreData['has_sufficient_data']),
                'requirement' => 'Verified Quality Score of 85.0+ (current: ' . ($scoreData['has_sufficient_data'] ? $qs : 'Insufficient Data') . ')'
            ],
            [
                'label' => 'Supervise >= 3 Qualifying Teams',
                'completed' => false,
                'requirement' => 'Direct management of at least 3 qualifying teams (each >= 10 active members)'
            ]
        ];
    } elseif ($currentRank === 'Manager') {
        $nextRank = 'City/Regional Head';
        $rankChecklist = [
            [
                'label' => 'Regional Management Appointment',
                'completed' => false,
                'requirement' => 'Administrative nomination and executive approval'
            ]
        ];
    }

    echo json_encode([
        'success' => true,
        'performance' => $scoreData,
        'team' => $teamInfo ?: null,
        'rankProgression' => [
            'currentRank' => $currentRank,
            'nextRank' => $nextRank,
            'checklist' => $rankChecklist
        ],
        'reviewHistory' => $reviewHistory
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
