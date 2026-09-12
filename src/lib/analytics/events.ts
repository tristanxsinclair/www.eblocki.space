/**
 * Centralised event taxonomy. Keep names verb_noun, lower_snake_case.
 * If you ship a name, never rename it — add a v2 instead.
 */
export const EVENTS = {
  // lifecycle
  app_opened: "app_opened",
  app_resumed: "app_resumed",
  app_paused: "app_paused",

  // auth
  signup_started: "signup_started",
  signup_completed: "signup_completed",
  login_completed: "login_completed",
  logout_completed: "logout_completed",

  // onboarding
  onboarding_started: "onboarding_started",
  onboarding_step_completed: "onboarding_step_completed",
  onboarding_completed: "onboarding_completed",

  // coach
  coach_message_sent: "coach_message_sent",
  coach_response_received: "coach_response_received",
  coach_state_detected: "coach_state_detected",

  // life-game presentation
  life_game_hud_viewed: "life_game_hud_viewed",
  life_game_panel_opened: "life_game_panel_opened",
  life_game_quest_viewed: "life_game_quest_viewed",
  life_game_quest_log_started: "life_game_quest_log_started",
  life_game_action_filed: "life_game_action_filed",
  life_game_xp_synced: "life_game_xp_synced",
  life_game_settlement_viewed: "life_game_settlement_viewed",
  life_game_demo_started: "life_game_demo_started",
  life_game_demo_signup_clicked: "life_game_demo_signup_clicked",
  gm_message_submitted: "gm_message_submitted",
  gm_quest_created: "gm_quest_created",
  arena_result_filed: "arena_result_filed",

  // proof
  proof_artifact_drafted: "proof_artifact_drafted",
  proof_artifact_submitted: "proof_artifact_submitted",
  proof_attachment_uploaded: "proof_attachment_uploaded",
  proof_ocr_completed: "proof_ocr_completed",
  proof_verdict_received: "proof_verdict_received",

  // control sheet
  control_sheet_opened: "control_sheet_opened",
  control_sheet_saved: "control_sheet_saved",

  // modes
  mode_activated: "mode_activated",
  mode_deactivated: "mode_deactivated",

  // retention
  streak_continued: "streak_continued",
  streak_broken: "streak_broken",

  // account
  account_deletion_requested: "account_deletion_requested",
  data_exported: "data_exported",
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];
