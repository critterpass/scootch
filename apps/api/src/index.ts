import { createApp } from './app';
import * as routes from './routes/index.generated';

export default createApp(Object.values(routes));
