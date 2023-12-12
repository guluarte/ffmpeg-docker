import { spawnSync } from "child_process";
import {
    readFileSync,
    writeFileSync,
    appendFileSync,
    rmSync,
    mkdirSync,
} from "fs";
import * as Sentry from "@sentry/node";
import Replicate from "replicate";
import AWS from "aws-sdk";
import express from "express";

// TODO: move this to a .env var
Sentry.init({
    dsn: process.env.SENTRY_DNS,
    // We recommend adjusting this value in production, or using tracesSampler
    // for finer control
    tracesSampleRate: 1.0,
  });

const s3 = new AWS.S3();

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

// Constants
const PORT = process.env.PORT;
const HOST = "0.0.0.0";

const OPENAI_WHISPER_MODEL =
    process.env.OPENAI_WHISPER_MODEL ||
    "openai/whisper:91ee9c0c3df30478510ff8c8a3a545add1ad0259ad3a9f78fba57fbc05ee64f7";

const TORTOISE_MODEL =
    process.env.TORTOISE_MODEL ||
    "afiaka87/tortoise-tts:e9658de4b325863c4fcdc12d94bb7c9b54cbfe351b7ca1b36860008172b91c71";

const TORTOISE_PRESET = process.env.TORTOISE_PRESET || "fast";
const OPENAI_WHISPER_LANGUAGE = process.env.OPENAI_WHISPER_LANGUAGE || "en";

// App
const app = express();

app.use(express.json());

app.get("/", async (req, res) => {
    res.send("Hello World");
});

app.post("/transcribe", async (req, res) => {
    const body = req.body;
    console.log(body);
    const { audio_url } = body;

    const output = await replicate.run(OPENAI_WHISPER_MODEL, {
        input: {
            audio: audio_url,
            language: OPENAI_WHISPER_LANGUAGE
        },
    });

    console.log(output);

    return res.json(output);
});

app.post("/coach-voice", async (req, res) => {
    const body = req.body;
    const { text, custom_voice_url } = body;

    console.log(text)
    console.log(custom_voice_url)

    const output = await replicate.run(TORTOISE_MODEL, {
        input: {
            text,
            custom_voice: custom_voice_url,
            'preset': TORTOISE_PRESET
        },
    });

    console.log(output);

    return res.json({
        audio: output
    });
});

app.post("/prepare", async (req, res) => {
    const body = req.body;
    console.log(body);
    const { userId } = body;
    const prefix = `audio/${userId}`;
    const bucket = process.env.AWS_BUCKET;
    const params = {
        Bucket: bucket,
        Prefix: prefix,
    };
    console.log(params);
    const records = await s3.listObjectsV2(params).promise();

    console.log(records);
    if (!records.Contents || records.Contents.length < 1) {
        console.log("Contents empty");
        console.log(records.Contents);
        return res.json({
            success: false,
        });
    }

    const userTmpPath = `/tmp/${userId}`;
    rmSync(userTmpPath, { recursive: true, force: true });
    mkdirSync(userTmpPath);

    let index = 0;
    for (const record of records.Contents) {
        if (!record) {
            console.log("empty record");
            console.log(record);
            continue;
        }

        console.log(record);
        console.log(record.Key);

        // get the file
        const s3Object = await s3
            .getObject({
                Bucket: bucket,
                Key: record.Key,
            })
            .promise();

        const tempName = record.Key.split("/").reverse()[0];
        // write file to disk
        writeFileSync(`${userTmpPath}/${tempName}`, s3Object.Body);
        // convert to wav!
        console.log(`${userTmpPath}/${tempName}`);
        spawnSync(
            "ffmpeg",
            [
                "-i",
                `${userTmpPath}/${tempName}`,
                "-f",
                "mp3",
                `${userTmpPath}/${index}.mp3`,
            ],
            { stdio: "inherit" }
        );

        appendFileSync(
            `${userTmpPath}/filelist.txt`,
            `file '${userTmpPath}/${index}.mp3'\n`
        );

        console.log(`Removing ${record.Key}`);
        await s3
            .deleteObject({
                Bucket: bucket,
                Key: record.Key,
            })
            .promise();

        index++;
        // delete the temp files
        //unlinkSync(`/tmp/${tempName}`);
    }

    // ffmpeg -f concat -i filelist.txt -c copy output.wav
    console.log("ffmpeg -f concat -i filelist.txt -c copy output.mp3");

    console.log(
        readFileSync(`${userTmpPath}/filelist.txt`, { encoding: "utf-8" })
    );
    const result = spawnSync(
        "ffmpeg",
        [
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            `${userTmpPath}/filelist.txt`,
            "-c",
            "copy",
            `${userTmpPath}/output.mp3`,
        ],
        { stdio: "inherit" }
    );

    console.log(result);
    const wavFile = readFileSync(`${userTmpPath}/output.mp3`);
    // upload wav to s3
    console.log(`Uploading file to S3`);
    await s3
        .putObject({
            Bucket: bucket,
            Key: `${prefix}/output.mp3`,
            Body: wavFile,
        })
        .promise();

    console.log(`Sending response ${prefix}/output.mp3`);
    return res.json({
        audio: `${prefix}/output.mp3`,
        success: true,
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false });
});

app.listen(PORT, HOST, () => {
    console.log(`Running on http://${HOST}:${PORT}`);
});
