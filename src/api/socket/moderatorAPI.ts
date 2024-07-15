import { Namespace } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import {
  allPlayerType,
  mostVotedPlayerType,
  voteBoardType,
  yesOrNoVoteResultType,
} from "../../types";
import { getVoteYesOrNoResult, initGame } from "../supabase/gamePlayAPI";
import { setRoomIsPlaying } from "../supabase/roomAPI";

//NOTE - 참가자들 랜덤으로 섞기(피셔-예이츠 셔플 알고리즘)
export const shufflePlayers = (
  allPlayers: allPlayerType[] | voteBoardType[]
) => {
  for (let i = allPlayers.length - 1; i >= 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [allPlayers[i], allPlayers[j]] = [allPlayers[j], allPlayers[i]];
  }
  return allPlayers;
};

//NOTE - 표를 가장 많이 받은 플레이어 확인
export const getMostVotedPlayer = (
  voteBoard: voteBoardType[],
  exceptedMafia: boolean
): mostVotedPlayerType => {
  const isValid = voteBoard[0].voted_count !== voteBoard[1].voted_count;
  console.log("투표 결과", voteBoard);

  if (isValid) {
    return { isValid, result: voteBoard[0] };
  } else {
    voteBoard = voteBoard.filter((vote) => vote.is_lived === true);

    if (exceptedMafia) {
      voteBoard = voteBoard.filter((vote) => vote.role !== "마피아");
    }

    const shuffledPlayers = shufflePlayers(voteBoard);
    console.log("isValid", isValid, "voteBoard", voteBoard);

    return { isValid, result: shuffledPlayers[0] };
  }
};

//NOTE - 찬성 반대 투표 결과
export const getYesOrNoVoteResult = async (
  roomId: string
): Promise<yesOrNoVoteResultType> => {
  const voteResult = await getVoteYesOrNoResult(roomId);
  let yesCount = 0;
  let noCount = 0;

  voteResult.forEach((vote) => {
    if (vote === true) {
      yesCount++;
    } else if (vote === false) {
      noCount++;
    }
  });

  return {
    result: yesCount > noCount,
    detail: { yesCount, noCount },
  };
};

//NOTE - 어느 팀이 이겼는지 결과 반환
export const whoWins = (allPlayers: allPlayerType[]) => {
  const mafiaPlayers = allPlayers
    .filter((player) => player.is_lived === true)
    .filter((player) => player.role === "마피아");
  const citizenPlayers = allPlayers
    .filter((player) => player.is_lived === true)
    .filter((player) => player.role !== "마피아");
  let mafiaCount;
  let citizenCount;

  mafiaPlayers.length > 0
    ? (mafiaCount = mafiaPlayers.length)
    : (mafiaCount = 0);

  citizenPlayers.length > 0
    ? (citizenCount = citizenPlayers.length)
    : (citizenCount = 0);

  console.log("마피아", mafiaCount, "시민", citizenCount); //FIXME - 테스트용 코드

  if (mafiaCount === 0) {
    return { isValid: true, result: "시민" };
  }

  if (mafiaCount >= citizenCount) {
    return { isValid: true, result: "마피아" };
  }

  return { isValid: false };
};

export const getRoleMaxCount = (totalCount: number) => {
  switch (totalCount) {
    case 5:
      return [1, 0, 0];
    case 6:
      return [2, 1, 0];
    case 7:
      return [2, 1, 0];
    case 8:
      return [3, 1, 1];
    case 9:
      return [3, 1, 1];
    case 10:
      return [3, 1, 1];
  }
  return [0, 0, 0];
};

export const playError = async (
  roundName: string,
  roomId: string,
  mafiaIo: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
  error: Error,
  start: NodeJS.Timeout | null
) => {
  if (roundName != "init") {
    await initGame(roomId);
  }

  await setRoomIsPlaying(roomId, false);
  console.log(`[playError] ${roundName}, ${error.message}`); //FIXME - 테스트용 코드
  console.log(error); //FIXME - 지우기
  mafiaIo.to(roomId).emit("playError", roundName, error.message);
  if (start) {
    clearInterval(start);
  }
};

export const gameOver = async (
  mafiaIo: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
  roomId: string,
  roundName: string,
  allPlayers: allPlayerType[],
  start: NodeJS.Timeout
) => {
  if (
    roundName === "init" ||
    roundName === "r0-0" ||
    roundName === "r0-1" ||
    roundName === "r0-2"
  ) {
    return roundName;
  }

  const gameResult = whoWins(allPlayers);
  const time = 5;

  console.log(gameResult); //FIXME - 테스트용 코드
  if (gameResult.isValid) {
    if (gameResult.result === "시민") {
      console.log(`[victoryPlayer] citizen / 5초`);
      mafiaIo.to(roomId).emit("victoryPlayer", "citizen", time);
    } else if (gameResult.result === "마피아") {
      console.log(`[victoryPlayer] mafia / 5초`);
      mafiaIo.to(roomId).emit("victoryPlayer", "mafia", time);
    }
    roundName = "gameEnd";
    mafiaIo.to(roomId).emit("gameEnd");
    await initGame(roomId);
    await setRoomIsPlaying(roomId, false);

    clearInterval(start);
  }
  return roundName;
};
