'use strict';
const FunctionErrors=(()=>{
function detail(value){if(typeof value==='string'){try{return detail(JSON.parse(value))}catch{return value}}if(value&&typeof value==='object'){if(typeof value.error==='string')return value.error;if(value.error?.message)return value.error.message;if(typeof value.message==='string')return value.message;if(value.body)return detail(value.body)}return ''}
async function message(error,fallback='Não foi possível executar a função.'){let body='',status;const context=error?.context;try{status=context?.status||context?.statusCode;if(context&&typeof context.json==='function'){const source=typeof context.clone==='function'?context.clone():context;try{body=detail(await source.json())}catch{if(typeof context.text==='function')body=detail(await context.text())}}else if(context&&typeof context.text==='function')body=detail(await context.text());else body=detail(context)}catch{/* The original error still has a usable message. */}
if(body)return String(body).slice(0,1500);
const original=String(error?.message||'');
if(status===401||/Invalid JWT|JWT expired/i.test(original))return 'A função recusou a sessão (401). Saia e entre novamente. Se continuar, confira os logs da função no Supabase.';
if(status===404)return 'A função não foi encontrada. Confira se mf-it-ai foi publicada no projeto Supabase correto.';
if(/Failed to fetch|Failed to send a request|FunctionsFetchError/i.test(original)||error?.name==='FunctionsFetchError')return 'Não foi possível conectar à função. Confira a conexão, a publicação de mf-it-ai e os logs no Supabase.';
return original&&original!=='Edge Function returned a non-2xx status code'?original:fallback+(status?' Código HTTP: '+status+'.':'');}
return {message};
})();
