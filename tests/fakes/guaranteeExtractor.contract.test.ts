import { guaranteeExtractorContract } from '../contracts/guaranteeExtractorContract';
import { fakePorts } from './ports';

guaranteeExtractorContract('fake', () => fakePorts({}).extractor);
