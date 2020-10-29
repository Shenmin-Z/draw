import React, { FC, useRef, useReducer } from "react";
import { useChatContext } from "./chat-context";
import { Row, RowGroup, ProfileImage } from "./common";
import { BG_GRAY, TEXT_GRAY } from "./colors";
import { ImageCrop } from "./crop";

type State = {
  imgFile: File;
  showCrop: boolean;
};

type Action = ["setImgFile", File];

type Reducer = {
  (s: State, a: Action): State;
};

export let EditProfile: FC = () => {
  let { chatState } = useChatContext();
  let { en_zh, wsConn } = chatState;

  let inputRef = useRef<HTMLInputElement>();

  let [state, dispath] = useReducer<Reducer>(
    (state, action) => {
      let [type, payload] = action;
      switch (type) {
        case "setImgFile":
          return { ...state, imgFile: payload as File };
        default:
          return state;
      }
    },
    { imgFile: null, showCrop: false }
  );

  return (
    <>
      <div style={{ backgroundColor: BG_GRAY, height: "100%" }}>
        <RowGroup>
          <Row
            text={en_zh("Profile Photo", "头像")}
            addtional={<ProfileImage />}
            rightArrow={true}
            onClick={() => {
              inputRef.current.click();
            }}
          />
          <Row
            text={en_zh("Name", "昵称")}
            addtional={<div style={{ color: TEXT_GRAY }}>Name Here</div>}
            rightArrow={true}
          />
          <Row
            text={en_zh("ID", "ID")}
            addtional={<div style={{ color: TEXT_GRAY }}>xx-xxx-xxx</div>}
            rightArrow={true}
          />
        </RowGroup>
        <input
          ref={inputRef}
          type="file"
          accept=".jpg, .jpeg, .png"
          style={{ display: "none" }}
          onChange={() => {
            let files = inputRef.current.files;
            if (files.length === 1) {
              dispath(["setImgFile", files[0]]);
            }
          }}
        />
      </div>
      {state.imgFile && (
        <ImageCrop
          file={state.imgFile}
          onOk={async r => {
            try {
              let data = await assembleBinary(r, state.imgFile);
              wsConn.binaryType = "arraybuffer";
              wsConn.send(data);
              dispath(["setImgFile", null]);
            } catch (e) {
              console.error(e);
            }
          }}
          onCancel={() => {
            dispath(["setImgFile", null]);
          }}
        />
      )}
    </>
  );
};

let assembleBinary = (
  r: { x: number; y: number; w: number; h: number },
  file: File
): Promise<ArrayBuffer> => {
  let type = new Uint8Array(1);
  type[0] = 1; // UPLOAD_AND_CROP

  let payload = new Uint16Array(4);
  payload[0] = r.x;
  payload[1] = r.y;
  payload[2] = r.w;
  payload[3] = r.h;

  return new Promise((res, rej) => {
    let reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = () => {
      res(
        new Uint8Array([
          ...type,
          ...new Uint8Array(payload.buffer),
          ...new Uint8Array(reader.result as ArrayBuffer)
        ])
      );
    };
    reader.onerror = e => {
      rej(e);
    };
  });
};
