# compare a frame of a cut (cropped to the footage) with one source frame: cmp.py cut.mp4 t_out source.mp4 t_src
import sys, subprocess, numpy as np
def grab(f, t, crop):
    vf = ['-vf', 'crop=1080:1080:0:420'] if crop else []
    raw = subprocess.run(['ffmpeg','-v','error','-ss',f'{t}','-i',f,'-frames:v','1'] + vf + ['-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(1080,1080,3).astype(float)
o = grab(sys.argv[1], sys.argv[2], True); a = grab(sys.argv[3], sys.argv[4], False)
print('mean abs diff', round(np.abs(a-o).mean(),2), 'src', np.round(a.mean(axis=(0,1)),1), 'out', np.round(o.mean(axis=(0,1)),1))
