/* Detecta localmente e envia ao gravador somente o canvas já coberto. */
const FacePrivacy = (() => {
  let loading;
  function detector() {
    return loading ??= (async () => {
      try {
        const {FaceDetector, FilesetResolver} = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs');
        const files = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm');
        return await FaceDetector.createFromOptions(files, {
          baseOptions: {modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite', delegate:'CPU'},
          runningMode:'VIDEO', minDetectionConfidence:0.35
        });
      } catch (error) { loading = null; throw Error('Não foi possível carregar a proteção de rostos. Confira a conexão e tente novamente.'); }
    })();
  }
  // Reutiliza buffers para não criar canvases a cada rosto/quadro.
  const tiny=document.createElement('canvas'), soft=document.createElement('canvas');
  function cloud(ctx, box) {
    const rx=box.width*.85,ry=box.height*1.0;
    const x=box.originX+box.width/2,y=box.originY+box.height/2;
    const left=Math.max(0,Math.floor(x-rx)),top=Math.max(0,Math.floor(y-ry));
    const width=Math.min(ctx.canvas.width-left,Math.ceil(rx*2));
    const height=Math.min(ctx.canvas.height-top,Math.ceil(ry*2));
    if(width<=0||height<=0)return;
    tiny.width=6;tiny.height=6;
    const small=tiny.getContext('2d');
    small.drawImage(ctx.canvas,left,top,width,height,0,0,6,6);
    soft.width=width;soft.height=height;
    const out=soft.getContext('2d');
    out.imageSmoothingEnabled=true;out.imageSmoothingQuality='high';
    // A redução forte remove detalhes antes do acabamento desfocado.
    out.filter='blur('+Math.max(12,Math.round(box.width*.15))+'px)';
    out.drawImage(tiny,-width*.25,-height*.25,width*1.5,height*1.5);
    out.filter='none';
    out.globalCompositeOperation='destination-in';
    out.save();out.translate(x-left,y-top);out.scale(rx,ry);
    const fade=out.createRadialGradient(0,0,0,0,0,1);
    fade.addColorStop(0,'rgba(0,0,0,1)');
    fade.addColorStop(.72,'rgba(0,0,0,1)');
    fade.addColorStop(1,'rgba(0,0,0,0)');
    out.fillStyle=fade;out.fillRect(-1,-1,2,2);out.restore();
    out.globalCompositeOperation='source-over';
    ctx.drawImage(soft,left,top);
  }
  async function create(raw) {
    const model = await detector();
    const video = document.createElement('video');
    video.muted = true; video.autoplay = true; video.playsInline = true;
    video.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;pointer-events:none';
    document.body.append(video); video.srcObject = raw;
    let output, frame, closed = false;
    const stop = () => {closed=true;cancelAnimationFrame(frame);video.pause();video.srcObject=null;video.remove();output?.getVideoTracks().forEach(t=>t.stop());};
    try {
      await video.play();
      if (!video.videoWidth) await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=()=>reject(Error('Câmera sem imagem.'));});
      const canvas=document.createElement('canvas');
      canvas.width=video.videoWidth;canvas.height=video.videoHeight;
      const ctx=canvas.getContext('2d',{alpha:false});
      if(!ctx||!canvas.captureStream)throw Error('Este navegador não suporta gravação com proteção de rostos.');
      ctx.fillStyle='#e2e8f0';ctx.fillRect(0,0,canvas.width,canvas.height);
      output=canvas.captureStream(0);
      const track=output.getVideoTracks()[0];
      if(!track?.requestFrame)throw Error('Use um navegador compatível com captura protegida por quadro.');
      raw.getAudioTracks().forEach(t=>output.addTrack(t));
      let last=-Infinity;
      function draw(now) {
        if(closed)return;
        if(now-last>=1000/15 && video.readyState>=2) {
          last=now;
          try {
            // A detecção e o desenho usam o mesmo quadro congelado.
            ctx.drawImage(video,0,0,canvas.width,canvas.height);
            const result=model.detectForVideo(canvas,performance.now());
            result.detections.forEach(face=>cloud(ctx,face.boundingBox));
          } catch (error) {
            // Nunca emitir o quadro original quando o detector falha.
            ctx.fillStyle='#e2e8f0';ctx.fillRect(0,0,canvas.width,canvas.height);
          }
          track.requestFrame();
        }
        frame=requestAnimationFrame(draw);
      }
      draw(performance.now());
      return {stream:output,stop};
    } catch(error) {stop();throw error;}
  }
  return {create};
})();
