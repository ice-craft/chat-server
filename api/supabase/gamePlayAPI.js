import { supabase } from "./client.js";

export const checkPlayerCountEnough = async (room_id, total_user_count) => {
  const { count, error } = await supabase
    .from("room_user_match_table")
    .select("*", { count: "exact", head: true })
    .eq("room_id", room_id);

  if (error) {
    throw new Error();
  }
  return total_user_count === count;
};

export const checkAllPlayersReady = async (room_id, total_user_count) => {
  const { count, error } = await supabase
    .from("room_user_match_table")
    .select("*", { count: "exact", head: true })
    .eq("room_id", room_id)
    .eq("is_ready", true);

  if (error) {
    throw new Error();
  }
  return total_user_count === count;
};

export const getRoleCount = async (room_id, role) => {
  const { count, error } = await supabase
    .from("room_user_match_table")
    .select("*", { count: "exact", head: true })
    .eq("room_id", room_id)
    .eq("role", role);

  if (error) {
    throw new Error();
  }
  return count;
};

export const setPlayerRole = async (user_id, role) => {
  const { error } = await supabase
    .from("room_user_match_table")
    .update({ role })
    .eq("user_id", user_id);

  if (error) {
    throw new Error();
  }
};

export const getPlayerByRole = async (room_id, role) => {
  const { data, error } = await supabase
    .from("room_user_match_table")
    .select("user_id")
    .eq("room_id", room_id)
    .eq("role", role)
    .eq("is_lived", true);

  if (error) {
    throw new Error();
  }

  if (data.length === 0) {
    return null;
  }

  const result = data.map((item) => item.user_id);

  return result;
};

export const voteTo = async (user_id) => {
  const { data, selectError } = await supabase
    .from("room_user_match_table")
    .select("voted_count")
    .eq("user_id", user_id)
    .single();

  if (selectError) {
    throw new Error();
  }
  const votedCount = data.voted_count;

  const { userId, updateError } = await supabase
    .from("room_user_match_table")
    .update({ voted_count: votedCount + 1 })
    .eq("user_id", user_id);

  if (updateError) {
    throw new Error();
  }

  return userId;
};

export const resetVote = async (room_id) => {
  const { data, error } = await supabase
    .from("room_user_match_table")
    .update({ vote_to: null, voted_count: 0 })
    .eq("room_id", room_id)
    .select();

  if (error) {
    throw new Error();
  }

  return data;
};

export const getVoteToResult = async (room_id) => {
  const { data, error } = await supabase
    .from("room_user_match_table")
    .select("user_id, user_nickname, voted_count")
    .eq("room_id", room_id)
    .order("voted_count", { ascending: false });

  if (error) {
    throw new Error();
  }

  return data;
};

export const voteYesOrNo = async (user_id, yesOrNo) => {
  const { data, error } = await supabase
    .from("room_user_match_table")
    .update({ vote_to: yesOrNo })
    .eq("user_id", user_id)
    .select();

  if (error) {
    throw new Error();
  }

  return data;
};

export const getVoteYesOrNoResult = async (room_id) => {
  const { data, error } = await supabase
    .from("room_user_match_table")
    .select("vote_to")
    .eq("room_id", room_id);

  if (error) {
    throw new Error();
  }

  const result = data.map((item) => item.vote_to);

  return result;
};

export const killPlayer = async (user_id) => {
  const { data, error } = await supabase
    .from("room_user_match_table")
    .update({ is_lived: false })
    .eq("user_id", user_id)
    .select("user_id")
    .single();

  if (error) {
    throw new Error();
  }

  return data.user_id;
};

export const savePlayer = async (user_id) => {
  const { data, error } = await supabase
    .from("room_user_match_table")
    .update({ is_lived: true })
    .eq("user_id", user_id)
    .select("user_id")
    .single();

  if (error) {
    throw new Error();
  }

  return data.user_id;
};

export const choosePlayer = async (user_id, role) => {
  const { error } = await supabase
    .from("room_user_match_table")
    .update({ chosen_by: role, choose_time: new Date() })
    .eq("user_id", user_id);
  if (error) {
    console.log(error);
    throw new Error();
  }
};

export const checkChosenPlayer = async (room_id, role) => {
  const { data, error } = await supabase
    .from("room_user_match_table")
    .select("user_id")
    .eq("room_id", room_id)
    .eq("chosen_by", role)
    .order("choose_time", { ascending: true });

  if (error) {
    console.log(error);
    throw new Error();
  }

  if (data.length === 0) {
    return null;
  }

  return data[0].user_id;
};

export const checkPlayerMafia = async (user_id) => {
  const { data, error } = await supabase
    .from("room_user_match_table")
    .select("user_id")
    .eq("user_id", user_id)
    .eq("role", "마피아");

  if (error) {
    throw new Error();
  }

  if (data.length === 0) {
    return false;
  }

  return true;
};

export const resetChosenPlayer = async (room_id) => {
  const { error } = await supabase
    .from("room_user_match_table")
    .update({ chosen_by: null })
    .eq("room_id", room_id);

  if (error) {
    throw new Error();
  }
};

export const checkPlayerLived = async (user_id) => {
  const { data, error } = await supabase
    .from("room_user_match_table")
    .select("is_lived")
    .eq("user_id", user_id)
    .single();

  if (error) {
    throw new Error();
  }

  return data.is_lived;
};

export const getPlayerNickname = async (user_id) => {
  const { data, error } = await supabase
    .from("room_user_match_table")
    .select("user_nickname")
    .eq("user_id", user_id)
    .single();

  if (error) {
    throw new Error();
  }

  return data.user_nickname;
};

export const getStatus = async (room_id, status, total_user_count) => {
  const { count, error } = await supabase
    .from("room_user_match_table")
    .select("*", { count: "exact", head: true })
    .eq("room_id", room_id)
    .eq(status, true);

  if (error) {
    throw new Error();
  }
  return total_user_count === count;
};

export const setStatus = async (user_id, status) => {
  const { data, error } = await supabase
    .from("room_user_match_table")
    .update(status)
    .eq("user_id", user_id)
    .select();

  if (error) {
    throw new Error();
  }
  return data;
};

export const getRoleMaxCount = async (total_user_count, role) => {
  const { data, error } = await supabase
    .from("room_composition")
    .select(role)
    .eq("total_user_count", total_user_count)
    .single();

  if (error) {
    console.log(error);
    throw new Error();
  }

  return data[role];
};

export const getCurrentUserDisplay = async (room_id) => {
  const { data, error } = await supabase
    .from("room_user_match_table")
    .select("user_id, user_nickname, is_lived")
    .eq("room_id", room_id);

  if (error) {
    throw new Error();
  }
  return data;
};

export const resetRoundR0 = async (room_id) => {
  const { error } = await supabase
    .from("room_user_match_table")
    .update({
      r0NightStart: false,
      r0TurnAllUserCameraMikeOff: false,
      r0SetAllUserRole: false,
      r0ShowAllUserRole: false,
      r0ShowMafiaUserEachOther: false,
      r0TurnMafiaUserCameraOn: false,
      r0TurnMafiaUserCameraOff: false,
    })
    .eq("room_id", room_id);

  if (error) {
    throw new Error();
  }
};

export const resetRoundR1 = async (room_id) => {
  const { error } = await supabase
    .from("room_user_match_table")
    .update({
      r1MorningStart: false,
      r1TurnAllUserCameraMikeOn: false,
      r1FindMafia: false,
      r1MetingOver: false,
      r1VoteToMafia: false,
      r1ShowVoteToResult: false,
      r1ShowMostVotedPlayer: false,
      r1LastTalk: false,
      r1VoteYesOrNo: false,
      r1ShowVoteYesOrNoResult: false,
      r1KillMostVotedPlayer: false,
      r1TurnAllUserCameraMikeOff: false,
      r1DecideMafiaToKillPlayer: false,
      r1TurnMafiaUserCameraOn: false,
      r1GestureToMafiaEachOther: false,
      r1TurnMafiaUserCameraOff: false,
      r1DecideDoctorToSavePlayer: false,
      r1DecidePoliceToDoubtPlayer: false,
      r1ShowDoubtedPlayer: false,
      r1KillPlayerByRole: false,
    })
    .eq("room_id", room_id);

  if (error) {
    throw new Error();
  }
};

export const resetRoundR2 = async (room_id) => {
  const { error } = await supabase
    .from("room_user_match_table")
    .update({
      r2MorningStart: false,
      r2TurnAllUserCameraMikeOn: false,
      r2ShowIsPlayerLived: false,
    })
    .eq("room_id", room_id);

  if (error) {
    throw new Error();
  }
};

export const resetPlayerStatus = async (room_id) => {
  const { error } = await supabase
    .from("room_user_match_table")
    .update({
      is_ready: false,
      role: "시민",
      is_lived: true,
      vote_to: null,
      voted_count: 0,
      chosen_by: null,
      choose_time: null,
    })
    .eq("room_id", room_id);

  if (error) {
    throw new Error();
  }
};