import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {readConfig} from './branch-safety.mjs';
const exec=(...args)=>execFileSync('git',args,{encoding:'utf8',timeout:20000}).trim();
const safeRef=x=>{
  if(!/^[A-Za-z0-9][A-Za-z0-9/_-]{1,150}$/.test(x))throw Error('Unsafe ref');
  return 'refs/remotes/origin/'+x;
};
export function checkDrift(config,runner=exec) {
  const names=['main',config.integration_branch,...Object.keys(config.lanes)], details=[];
  for(const branch of names) {
    const base=branch==='main'?null:branch===config.integration_branch?'main':config.integration_branch;
    const left=safeRef(branch);
    try {
      const sha=runner('rev-parse','--verify',left);
      if(!base){details.push({branch,base:null,sha,status:'SOURCE'});continue;}
      const right=safeRef(base);runner('rev-parse','--verify',right);
      const behind=Number(runner('rev-list','--count',left+'..'+right));
      const ahead=Number(runner('rev-list','--count',right+'..'+left));
      const fastForward=behind>0 && ahead===0;
      details.push({branch,base,sha,ahead,behind,safe_fast_forward:fastForward,
        status:behind>config.max_behind_commits?'STALE':behind===0?'CURRENT':fastForward?'FAST_FORWARD_ELIGIBLE':'DIVERGED'});
    }catch{details.push({branch,base,status:'UNKNOWN',safe_fast_forward:false});}
  }
  return {repository:config.repository,mode:'READ_ONLY',time:new Date().toISOString(),details};
}
if(process.argv[1]?.endsWith('/branch-drift.mjs')) {
  try{
    const result=checkDrift(readConfig());console.log(JSON.stringify(result,null,2));
    if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      '### Read-only agent drift report\n\n'+result.details.map(x=>
        '- '+x.branch+': '+x.status+' (ahead '+(x.ahead??'?')+', behind '+(x.behind??'?')+')').join('\n')+'\n');
    if(result.details.some(x=>x.status==='UNKNOWN'))process.exitCode=1;
  }catch(e){console.error('Drift failed closed: '+e.message);process.exitCode=1;}
}
