import type {Config} from '../shared/config.js';
import {S3Artifacts} from './store.js';
import {LocalArtifacts} from './local.js';
export function artifactStore(c:Config){
 if(c.ARTIFACT_STORAGE==='local'){
  if(c.NODE_ENV==='production')throw Error('Production requires private object storage');
  return new LocalArtifacts();
 }
 return new S3Artifacts(c);
}
