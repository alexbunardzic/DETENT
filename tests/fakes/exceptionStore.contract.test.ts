import { exceptionStoreContract } from '../contracts/exceptionStoreContract';
import { fakePorts } from './ports';

exceptionStoreContract('fake', exceptions => fakePorts({ exceptions }).exceptions);
