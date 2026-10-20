import { artifactSourceContract } from '../contracts/artifactSourceContract';
import { fakePorts } from './ports';

artifactSourceContract('fake', history => ({
  port: fakePorts({ refs: history }).artifacts,
  ref: label => label,
  unknownRef: 'no-such-ref',
}));
