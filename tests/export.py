"""Export: MP3 with tags and cover, WAV, stems zip, share card. Files are checked with ffprobe / zipfile / PIL."""
import os,asyncio,subprocess,zipfile,json
from playwright.async_api import async_playwright
JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
OUT=os.environ.get('SHOT','/tmp')
def probe(path):
    r=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration,bit_rate:format_tags=title,artist,album:stream=codec_name,sample_rate,channels,width,height','-of','json',path],capture_output=True,text=True)
    return json.loads(r.stdout or '{}')
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx=await b.new_context(viewport={'width':1368,'height':912},accept_downloads=True);pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(JR);await pg.wait_for_timeout(1200);await pg.click('#welcomeX')
        await pg.click('#bStart');await pg.click('.vibe[data-v="Pop"]');await pg.wait_for_timeout(1200)
        async def run(fmt,stems,ext):
            await pg.click('#bMenu');await pg.wait_for_timeout(300);await pg.click('[data-x=export]');await pg.wait_for_timeout(200)
            await pg.click(f'.xcard[data-f={fmt}]')
            if await pg.query_selector('[data-w=song]'):await pg.click('[data-w=song]')
            await pg.fill('#xTitle','Test Song');await pg.fill('#xArtist','Evan')
            if (await pg.is_checked('#xStems'))!=stems:await pg.click('#xStems')
            if stems is False and await pg.query_selector('#xStems'):pass
            if fmt=='mp3':await pg.screenshot(path=OUT+'/export_dialog.png')
            async with pg.expect_download(timeout=240000) as dl:
                await pg.click('[data-x=go]')
            d=await dl.value;path=OUT+'/'+d.suggested_filename;await d.save_as(path);return path
        p1=await run('mp3',False,'mp3');pr=probe(p1);print('MP3',os.path.basename(p1),os.path.getsize(p1)//1024,'KB',pr.get('format',{}),[ (s.get('codec_name'),s.get('sample_rate'),s.get('channels'),s.get('width')) for s in pr.get('streams',[])])
        p2=await run('wav',False,'wav');pr=probe(p2);print('WAV',os.path.basename(p2),os.path.getsize(p2)//1024,'KB',pr.get('format',{}).get('duration'))
        p3=await run('mp3',True,'zip');z=zipfile.ZipFile(p3);print('ZIP',os.path.basename(p3),os.path.getsize(p3)//1024,'KB',[(i.filename,i.file_size//1024) for i in z.infolist()],'crc ok',z.testzip() is None)
        z.extract(z.infolist()[1],OUT);print('stem probe',probe(OUT+'/'+z.infolist()[1].filename).get('format',{}).get('duration'))
        await pg.click('#bMenu');await pg.wait_for_timeout(300)
        async with pg.expect_download(timeout=120000) as dl:
            await pg.click('[data-x=card]')
        d=await dl.value;p4=OUT+'/'+d.suggested_filename;await d.save_as(p4)
        from PIL import Image;im=Image.open(p4);print('CARD',os.path.basename(p4),im.size)
        print('errors',errs[:5]);await b.close()
asyncio.run(main())
