#!/usr/bin/env node
"use strict";

process.on("unhandledRejection", exn => { throw exn; });

const TEST_RELEASE_BUILD = +process.env.TEST_RELEASE_BUILD;
const SHOW_LOGS = false;

var V86 = require(`../../build/${TEST_RELEASE_BUILD ? "libv86" : "libv86-debug"}.js`).V86;
const fs = require("fs");

const emulator = new V86({
    bios: { url: __dirname + "/../../bios/seabios.bin" },
    vga_bios: { url: __dirname + "/../../bios/vgabios.bin" },
    cdrom: { url: __dirname + "/../../images/linux4.iso" },
    autostart: true,
    memory_size: 512 * 1024 * 1024,
    bzimage_initrd_from_filesystem: true,
    cmdline: [
        "console=ttyS0",
        "rw apm=off vga=0x344 video=vesafb:ypan,vremap:8",
        "root=host9p rootfstype=9p rootflags=trans=virtio,cache=loose mitigations=off",
        "audit=0 init=/usr/bin/init-openrc net.ifnames=0 biosdevname=0",
    ].join(" "),
    filesystem: {
        basefs: "images/fs.json",
        baseurl: "images/arch-nongz/",
    },
    disable_jit: +process.env.DISABLE_JIT,
    log_level: SHOW_LOGS ? 0x400000 : 0,
    virtio_console: true,
});

let line = "";
let sent_command = false;

emulator.add_listener("serial0-output-byte", function(byte)
{
    var chr = String.fromCharCode(byte);

    process.stdout.write(chr);

    if(chr === "\n")
    {
        line = "";
    }
    else
    {
        line += chr;
    }

    // TODO: use better prompt detection once it's configured to not print colours
    if(!sent_command && line.endsWith("# ") && line.includes("root@localhost"))
    {
        sent_command = true;
        emulator.serial0_send("lspci -vv; /etc/openrc/init.d/udev start; echo ping > /dev/hvc0\n");
    }

    if(line.endsWith("pong"))
    {
        console.log("\nTest passed");
        emulator.stop();
    }
});

let got_output = false;

emulator.add_listener("virtio-console0-output-bytes", function(bytes)
{
    if(!got_output)
    {
        got_output = true;
        console.log("From virtio console:", String.fromCharCode.apply(String, bytes));
        emulator.serial0_send("cat /dev/hvc0\n");
        setTimeout(() => {
            emulator.bus.send("virtio-console0-input-bytes", Uint8Array.from(Buffer.from("pong\n")));
        }, 5000);
    }
});
