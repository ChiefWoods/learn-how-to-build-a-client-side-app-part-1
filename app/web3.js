import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Wallet } from "./wallet.js";
import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import { IDL } from "../target/types/tic_tac_toe";
import { Buffer } from "buffer";
import { idToTile, setTiles } from "./utils.js";

window.Buffer = Buffer;
window.program = null;

export const PROGRAM_ID = new PublicKey("6nGpXemBCiPJRFdzheSMQAPnu7ntyfQiycNjMBpbLXaa");

export function connectWallet() {
  const keypairStr = sessionStorage.getItem('keypair');
  const keypairArr = JSON.parse(keypairStr);
  const uint8Arr = new Uint8Array(keypairArr);
  const keypair = Keypair.fromSecretKey(uint8Arr);

  const wallet = new Wallet(keypair);
  const provider = new AnchorProvider(connection, wallet, {});

  setProvider(provider);

  const program = new Program(IDL, PROGRAM_ID, provider);
  window.program = program;
}

export async function startGame() {
  const gameId = sessionStorage.getItem('gameId');
  const playerOnePublicKey = new PublicKey(sessionStorage.getItem('playerOnePublicKey'));
  const playerTwoPublicKey = new PublicKey(sessionStorage.getItem('playerTwoPublicKey'));
  const gamePublicKey = await deriveGamePublicKey(playerOnePublicKey, gameId);

  sessionStorage.setItem('gamePublicKey', gamePublicKey.toString());

  const keypairStr = sessionStorage.getItem('keypair');
  const keypairArr = JSON.parse(keypairStr);
  const uint8Arr = new Uint8Array(keypairArr);
  const keypair = Keypair.fromSecretKey(uint8Arr);

  await window.program.methods
    .setupGame(playerTwoPublicKey, gameId)
    .accounts({
      player: keypair.publicKey,
      game: gamePublicKey,
    })
    .signers([keypair])
    .rpc();

  await updateBoard();
}

export async function handlePlay(id) {
  const tile = idToTile(id);
  const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(sessionStorage.getItem('keypair'))));
  const gamePublicKey = new PublicKey(sessionStorage.getItem("gamePublicKey"));

  await window.program.methods
    .play(tile)
    .accounts({ player: keypair.publicKey, game: gamePublicKey })
    .signers([keypair])
    .rpc();

  await updateBoard();
}

export async function deriveGamePublicKey(playerOnePublicKey, gameId) {
  return PublicKey.findProgramAddressSync([Buffer.from("game"), playerOnePublicKey.toBuffer(), Buffer.from(gameId)], PROGRAM_ID)[0];
}

async function getGameAccount() {
  const gamePublicKey = new PublicKey(sessionStorage.getItem("gamePublicKey"));
  const gameData = await window.program.account.game.fetch(gamePublicKey);

  return gameData;
}

export async function updateBoard() {
  const gameData = await getGameAccount();
  const board = gameData.board;
  setTiles(board);
}

const connection = new Connection("http://localhost:8899", "confirmed");
