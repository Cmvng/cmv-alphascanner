#!/usr/bin/env bash
echo "start $(date +%T)" >> /tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad/cs/out/jobs/progress.txt
xargs -P 4 -L 1 /tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad/cs/out/jobs/one.sh < /tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad/cs/out/jobs/list.txt
echo "ALL FINISHED $(date +%T)" >> /tmp/claude-0/-home-user-cmv-alphascanner/9da965d5-a1fd-5015-a86d-55dc14de3b8c/scratchpad/cs/out/jobs/progress.txt
