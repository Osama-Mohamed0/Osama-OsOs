"""Assemble the film: concatenate the rendered scene videos (identical to the Main composition,
frame for frame), apply the global finish (vignette + light film grain), mux the mixed soundtrack.
Output: final/Timur_vs_Bayezid.mp4  (1920x1080, 30 fps, H.264 + AAC)."""
import json
import os
import subprocess
import sys

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CRF = os.environ.get('CRF', '21')


def probe_frames(p):
    out = subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets,width,height,r_frame_rate', '-of', 'json', p])
    s = json.loads(out)['streams'][0]
    return int(s['nb_read_packets']), s['width'], s['height'], s['r_frame_rate']


def main():
    tim = json.load(open('story/timing.json'))
    problems = []
    lines = []
    for s in tim['scenes']:
        p = f'out/scenes/{s["id"]}.mp4'
        if not os.path.exists(p):
            problems.append(f'{s["id"]}: missing')
            continue
        n, w, h, r = probe_frames(p)
        if n != s['frames'] or (w, h) != (1920, 1080) or r != '30/1':
            problems.append(f'{s["id"]}: frames {n}/{s["frames"]} size {w}x{h} rate {r}')
        lines.append(f"file '{os.path.abspath(p)}'")
    if problems:
        print('PROBLEMS:\n' + '\n'.join(problems))
        sys.exit(1)
    os.makedirs('out', exist_ok=True)
    open('out/concat.txt', 'w').write('\n'.join(lines) + '\n')
    os.makedirs('final', exist_ok=True)
    vf = 'vignette=angle=PI/5.5:mode=forward,noise=alls=3:allf=t+u,format=yuv420p'
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-stats', '-f', 'concat', '-safe', '0', '-i', 'out/concat.txt', '-i', 'audio/soundtrack.wav',
           '-filter_complex', f'[0:v]{vf}[v]', '-map', '[v]', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', CRF,
           '-profile:v', 'high', '-level', '4.1', '-g', '60', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart',
           '-t', '900', 'final/Timur_vs_Bayezid.mp4']
    subprocess.run(cmd, check=True)
    print('done:', subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size,bit_rate', '-of', 'json', 'final/Timur_vs_Bayezid.mp4']).decode())


if __name__ == '__main__':
    main()
