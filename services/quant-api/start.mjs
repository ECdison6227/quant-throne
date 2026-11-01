import {createQuantApi} from './server.mjs';
const port=Number(process.env.QUANT_API_PORT||18894);
createQuantApi(process.env).server.listen(port,'127.0.0.1',()=>console.log(`Quant Throne API ready on loopback:${port}`));
