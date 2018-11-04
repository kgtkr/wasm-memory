#!/bin/sh -eu
wast2json memory.wast -o memory.json
spectest-interp memory.json