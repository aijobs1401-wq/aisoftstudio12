export const runtime = 'nodejs';

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const script = `(function () {
  var current = document.currentScript;
  if (!current) return;
  var botId = current.getAttribute('data-bot-id');
  if (!botId) return;
  var origin = ${JSON.stringify(origin)};
  var button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', 'Open chat');
  button.textContent = '💬';
  button.style.cssText = 'position:fixed;right:22px;bottom:22px;width:60px;height:60px;border:0;border-radius:50%;background:#f97316;color:#fff;font-size:27px;cursor:pointer;box-shadow:0 10px 28px rgba(0,0,0,.25);z-index:2147483000';
  var panel = document.createElement('div');
  panel.style.cssText = 'display:none;position:fixed;right:22px;bottom:94px;width:380px;height:570px;max-width:calc(100vw - 32px);max-height:calc(100vh - 120px);border:1px solid rgba(255,255,255,.14);border-radius:18px;overflow:hidden;background:#09090b;box-shadow:0 18px 50px rgba(0,0,0,.35);z-index:2147483000';
  var frame = document.createElement('iframe');
  frame.src = origin + '/chat/' + encodeURIComponent(botId) + '?widget=true';
  frame.title = 'AI Soft Studio assistant';
  frame.allow = 'clipboard-write';
  frame.style.cssText = 'width:100%;height:100%;border:0';
  panel.appendChild(frame);
  button.addEventListener('click', function () { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; });
  document.body.appendChild(panel);
  document.body.appendChild(button);
})();`;
  return new Response(script, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
