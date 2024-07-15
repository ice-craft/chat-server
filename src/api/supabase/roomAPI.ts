import { supabase } from "./client";

//NOTE - 해당 범위의 방들을 반환(데이터베이스의 인덱스는 0부터 시작, rowStart 인덱스와 rowEnd 인덱스를 포함해서 반환), 날짜 내림차순
export const getRooms = async () => {
  const { data, error } = await supabase
    .from("room_table")
    .select("*, users:room_user_match_table(user_id)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("방 목록 불러오기 실패");
  }

  return data;
};

//NOTE - 제목에 키워드가 포함된 방 목록 반환 (날짜 내림차순)
export const getRoomsWithKeyword = async (keyword: string) => {
  const { data, error } = await supabase
    .from("room_table")
    .select("*, users:room_user_match_table(user_id)")
    .like("title", `%${keyword}%`)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("키워드를 통해 방 목록 불러오기 실패");
  }

  return data;
};

//NOTE - 방 만들기 (방만 만듬, 방을 만들고 접속도 해야함)
export const createRoom = async (
  title: string,
  game_category: string,
  total_user_count: number
) => {
  const { data, error } = await supabase
    .from("room_table")
    .insert([{ title, game_category, current_user_count: 0, total_user_count }])
    .select()
    .single();

  if (error) {
    throw new Error("방 만들기 실패");
  }

  return data;
};

//NOTE - 방에 들어가기 (방 자리에 여유가 있고, 자신이 방에 없으면 방에 들어갈 수 있음 )
export const joinRoom = async (
  room_id: string,
  user_id: string,
  user_nickname: string
) => {
  const { total_user_count, current_user_count } = await getUserCountInRoom(
    room_id
  );
  const usersIdInRoom = await getUsersIdInRoom(room_id);
  const isPlaying = await getRoomIsPlaying(room_id);

  if (
    total_user_count - current_user_count > 0 &&
    usersIdInRoom.indexOf(user_id) === -1 &&
    !isPlaying
  ) {
    await changeUserCountInRoom(room_id, 1);

    const { data, error } = await supabase
      .from("room_user_match_table")
      .insert([{ room_id, user_id, user_nickname }])
      .select()
      .single();

    if (error) {
      throw new Error("방 입장 실패");
    }

    const chief = await decideChief(room_id);
    await setChief(room_id, chief);

    return data.room_id;
  }

  throw new Error("방 입장 실패");
};

//NOTE - 방 나가기 (내가 방에 존재하고 나 이외에 유저가 있으면 방에서 나감, 다른 유저가 방에 없으면 방 삭제)
export const exitRoom = async (room_id: string, user_id: string) => {
  const { current_user_count } = await getUserCountInRoom(room_id);
  const usersIdInRoom = await getUsersIdInRoom(room_id);

  if (current_user_count > 1 && usersIdInRoom.indexOf(user_id) !== -1) {
    await changeUserCountInRoom(room_id, -1);

    const { data, error } = await supabase
      .from("room_user_match_table")
      .delete()
      .eq("room_id", room_id)
      .eq("user_id", user_id)
      .select();

    if (error) {
      throw new Error("방 나가기 실패");
    }

    const chief = await decideChief(room_id);
    await setChief(room_id, chief);

    return data;
  } else if (
    current_user_count === 1 &&
    usersIdInRoom.indexOf(user_id) !== -1
  ) {
    const data = deleteRoom(room_id);
    return data;
  }
  throw new Error("방 나가기 실패");
};

//NOTE - 방 삭제하기 (방에 있는 유저가 오직 자신일 경우에 방 삭제)
export const deleteRoom = async (room_id: string) => {
  const { data, error } = await supabase
    .from("room_table")
    .delete()
    .eq("room_id", room_id);

  if (error) {
    throw new Error("방 삭제 실패");
  }

  return data;
};

//NOTE - 빠른 방 입장 (전체 인원 오름차순으로 정렬 후, 현재 인원 내림차순 정렬 후, 남은 인원이 0명인 방을 제외한 후, 첫 번째 방 입장)
export const fastJoinRoom = async (user_id: string, user_nickname: string) => {
  const { data, error } = await supabase
    .from("room_table")
    .select("*")
    .order("total_user_count", { ascending: true })
    .order("current_user_count", { ascending: false });

  if (error) {
    throw new Error("빠른 방 입장 실패");
  }

  const rows = data.filter(
    (row) => row.current_user_count < row.total_user_count
  );
  const room_id = rows[0].room_id;
  const result = await joinRoom(room_id, user_id, user_nickname);

  return result;
};

//NOTE - 방의 현재 인원 변경 (방의 인원을 change만큼 더함, change는 음수가 될 수 있어서, 인원을 감소할 수 있음)
export const changeUserCountInRoom = async (
  room_id: string,
  change: number
) => {
  const { current_user_count } = await getUserCountInRoom(room_id);

  const { data, error } = await supabase
    .from("room_table")
    .update({ current_user_count: current_user_count + change })
    .eq("room_id", room_id)
    .select();

  if (error) {
    throw new Error("방의 현재 인원 변경 실패");
  }

  return data;
};

//NOTE - 방에 들어갈 수 있는 총인원과 현재 인원 반환
export const getUserCountInRoom = async (room_id: string) => {
  const { data, error } = await supabase
    .from("room_table")
    .select("current_user_count, total_user_count")
    .eq("room_id", room_id)
    .single();

  if (error) {
    throw new Error("방의 현재 인원과 총 인원 조회 실패");
  }

  return {
    total_user_count: data.total_user_count,
    current_user_count: data.current_user_count,
  };
};

//NOTE - roomId의 방에 입장한 유저들 id 목록 반환
export const getUsersIdInRoom = async (roomId: string) => {
  const { data, error } = await supabase
    .from("room_user_match_table")
    .select("user_id")
    .eq("room_id", roomId);

  if (error) {
    throw new Error("방에 있는 유저들의 유저아이디 조회 실패");
  }

  return data.map((row) => row.user_id);
};

//NOTE - roomId의 방에 입장한 유저들 id와 닉네임 목록 반환
export const getUsersInfoInRoom = async (roomId: string) => {
  const { data, error } = await supabase
    .from("room_user_match_table")
    .select("user_id, user_nickname, is_ready")
    .eq("room_id", roomId);

  if (error) {
    throw new Error(
      "방에 있는 유저들의 유저 아이디, 닉네임, 레디 여부 조회 실패"
    );
  }

  return data;
};

//NOTE - 방의 방장을 설정
export const setChief = async (room_id: string, user_id: string) => {
  const { data, error } = await supabase
    .from("room_table")
    .update({ chief: user_id })
    .eq("room_id", room_id)
    .select();

  if (error) {
    throw new Error("방의 방장 설정 실패");
  }

  return data;
};

//NOTE - 방의 방장 유저아이디 반환
export const getChief = async (room_id: string) => {
  const { data, error } = await supabase
    .from("room_table")
    .select("chief")
    .eq("room_id", room_id)
    .single();

  if (error) {
    throw new Error("방의 방장 유저아이디 조회 실패");
  }

  return data.chief;
};

//NOTE - 방의 방장 정하기
export const decideChief = async (room_id: string) => {
  const { data, error } = await supabase
    .from("room_user_match_table")
    .select("user_id")
    .eq("room_id", room_id)
    .order("join_time", { ascending: true });

  if (error) {
    throw new Error("방의 방장 정하기 실패");
  }

  return data[0].user_id;
};

//NOTE - 방에서 게임이 진행중인지 여부 조회
export const getRoomIsPlaying = async (room_id: string) => {
  const { data, error } = await supabase
    .from("room_table")
    .select("is_playing")
    .eq("room_id", room_id)
    .single();

  if (error) {
    throw new Error("방에서 게임이 진행중인지 여부 조회 실패");
  }

  return data.is_playing;
};

//NOTE - 방에서 게임이 진행중인지 여부 수정
export const setRoomIsPlaying = async (
  room_id: string,
  is_playing: boolean
) => {
  const { data, error } = await supabase
    .from("room_table")
    .update({ is_playing })
    .eq("room_id", room_id)
    .select("room_id")
    .single();

  if (error) {
    throw new Error("방에서 게임이 진행중인지 여부 수정 실패");
  }

  return data.room_id;
};

//NOTE - 방의 정보를 조회
export const getRoomInfo = async (room_id: string) => {
  const { data, error } = await supabase
    .from("room_table")
    .select("*")
    .eq("room_id", room_id)
    .single();

  if (error) {
    throw new Error("방의 정보 조회 실패");
  }

  return data;
};
