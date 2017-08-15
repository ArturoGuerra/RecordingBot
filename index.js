#!/usr/bin/env nodejs
const fs = require('fs');
const path = require('path');
const discord = require('discord.js');
const client = new discord.Client();
const opus = require("node-opus");
const config = require('./config.json');

const rate = 48000;
const frame_size = 1920;
const channels = 2;
const encoder = new opus.OpusEncoder(rate, channels);

const WriteStreams = new Map();

client.on('ready', async () => {
    console.log(`${client.user.tag}`);
});

client.on('message', async (message) => {
    var msgRegex = "^-([A-z])+.*";
    var MsgMatch = message.content.match(msgRegex);
    if (MsgMatch) {
        try {
            var msgSlices = message.content.split(" ");
            var cmd = msgSlices[0].replace('-', '');
            var args = msgSlices.splice(1);
        } catch (err) {
            console.log(err.message);
            return
        }
        if (cmd === "record") {
            startRecording(message, args, cmd);
        }
    }
});


async function recordUserVoice(server) {
    let voiceReceiver = await server.voiceConnection.createReceiver();
    let path = `./recordings/${server.id}-${Date.now()}`;
    fs.mkdirSync(path);
    let writeStreams = new Map();
    voiceReceiver.on("opus", (user, buffer) => {
        let writeStream = writeStreams.get(user.id);
        if (!writeStream) {
            let writeStream = fs.createWriteStream(`${path}/${user.id}.raw_pcm`);
            writeStreams.set(user.id, writeStream);
        }
        const decoded = decode(buffer);
        if (decoded) {
            console.log(decoded);
            try {
                writeStream.write(decoded);
            } catch (err) {
                console.error(err.message);
            }
        }
        if (voiceReceiver.destroyed) {
            return writeStream;
        }
    })
}


function decode(frame) {
    try {
        buffer = encoder.decode(frame, frame_size);
    } catch (err) {
        console.error(err.message);
        try {
            buffer = encoder.decode(frame.slice(8), frame_size);
        } catch (err) {
            console.error(err.message);
            return null;
        }
    }
    return buffer;
}

async function startRecording(message, args, cmd) {
    console.log(args[0]);
    let channel = await message.guild.channels.get(args[0]);
    channel.join().then(conn => {
        recordUserVoice(message.guild);
    }).catch(err => {
        console.error(err.message)
    });
}

client.login(config.token);
