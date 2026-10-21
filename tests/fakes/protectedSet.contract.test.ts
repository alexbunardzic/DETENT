import { protectedSetContract } from '../contracts/protectedSetContract';
import { fakePorts } from './ports';

protectedSetContract('fake', protectedPaths => fakePorts({ protectedPaths }).protectedSet);
