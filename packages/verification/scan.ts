import {Fault,type Bundle} from '../shared/domain.js';
export function scan(bundle:Bundle){
 for(const f of bundle.files){
  if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(f.content)||/\b(?:sk-[A-Za-z0-9_-]{32,}|ghp_[A-Za-z0-9]{30,})\b/.test(f.content))throw new Fault(422,'secret_in_artifact');
 }
}
