# assembles a clean cut: the owner's original footage untouched (1:1, centred on black), black cards, the template
# soundtrack, and the transparent text layer.  python3 assemble.py spec.json source.mp4 textdir out.mp4
import json, subprocess, sys
spec_path, SRC, TXT, OUT = sys.argv[1:5]
spec = json.load(open(spec_path))
T = spec['total']
fc, labels = [], []
for i, s in enumerate(spec['segments']):
    d = round(s['t1'] - s['t0'], 4)
    if 'src' in s:
        a, b = s['src']
        k = d / (b - a)
        fc.append(f"[0:v]trim=start={a}:end={b},setpts=(PTS-STARTPTS)*{k:.6f},fps=30,trim=duration={d},tpad=stop_mode=clone:stop_duration=1,trim=duration={d},pad=1080:1920:0:420:black,setsar=1[g{i}]")
    elif 'hold' in s:
        a = s['hold']
        fc.append(f"[0:v]trim=start={a}:end={a + 0.04},setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration={d + 1},trim=duration={d},pad=1080:1920:0:420:black,setsar=1[g{i}]")
    else:
        fc.append(f"color=black:s=1080x1920:r=30:d={d},format=yuv420p,setsar=1[g{i}]")
    labels.append(f'[g{i}]')
fc.append(''.join(labels) + f"concat=n={len(labels)}:v=1:a=0,format=yuv420p[base]")
# overlay in yuv420 with the text converted to bt709 first: format=auto shifted the footage about 1.5 levels darker
fc.append("[1:v]scale=out_color_matrix=bt709:out_range=tv,format=yuva420p[tx];[base][tx]overlay=0:0:format=yuv420[v]")
af = spec.get('audio_fade', [T - 0.5, 0.4])
fc.append(f"[2:a]atrim=0:{T},afade=t=out:st={af[0]}:d={af[1]},apad=whole_dur={T},atrim=0:{T}[a]")
cmd = ['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-framerate', '30', '-i', f'{TXT}/%05d.png', '-i', spec['audio'],
       '-filter_complex', ';'.join(fc), '-map', '[v]', '-map', '[a]', '-t', str(T),
       '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', '30',
       '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', OUT]
r = subprocess.run(cmd, capture_output=True, text=True); print('assemble', r.returncode, r.stderr[-1500:])
