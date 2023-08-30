import path from 'path';
import md5 from 'md5';
import fs from 'fs/promises';

import axios from 'axios';
import asyncRetry from 'async-retry';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { parse } from 'ts-command-line-args';

interface ITransformArguments {
	image: string;
	output: string;
	mode?: string;
	proxy?: string;
	help?: boolean;
}

const args = parse<ITransformArguments>({
		image: {type: String, alias: 'i', description: 'Source image file path (./ for cwd)'},
		output: {type: String, alias: 'o', description: 'Result image path'},
		mode: {type: String, optional: true, alias: 'm', description: 'QQ generation modes:\n\nAI_PAINTING_ANIME\nDIFFERENT_DIMENSION_ME\n\nAI_PAINTING_ANIME is for China only. DIFFERENT_DIMENSION_ME - for other countries.\nDefault mode is - DIFFERENT_DIMENSION_ME'},
		proxy: {type: String, optional: true, alias: 'p', description: 'Proxy in following format: http://user:password@ip:port'},
		help: {type: Boolean, optional: true, alias: 'h', description: 'Prints usage guide'},
	},
	{helpArg: 'help'}
);

let httpsAgent: HttpsProxyAgent | undefined;
const mode = args.mode || 'DIFFERENT_DIMENSION_ME';

const makeObject = (image: Buffer) => {

	let busiId = '';

	if (mode === 'DIFFERENT_DIMENSION_ME') { busiId = 'different_dimension_me_img_entry';}
	else if (mode === 'AI_PAINTING_ANIME') { busiId = 'ai_painting_anime_img_entry'; }
	else { throw new Error('Wrong mode parameter specified'); }

	const obj = {
		busiId: busiId,
		extra: JSON.stringify({
			face_rects: [],
			version: 2,
			platform: 'web',
		}),
		images: [image.toString('base64')]
	};
	return obj;
};

const signV1 = (obj: Record<string, unknown>) => {
	const str = JSON.stringify(obj);
	let encoded = md5(
		'https://h5.tu.qq.com' +
		(str.length + (encodeURIComponent(str).match(/%[89ABab]/g)?.length || 0)) +
		'HQ31X02e',
	);
	return encoded;
};

const checkResponse = (data: Record<string, unknown> | undefined) => {
	if (!data) {
		throw new Error('No data');
	}
	if (data.msg === 'VOLUMN_LIMIT') {
		throw new Error('QQ rate limit caught');
	}		
	if ((data.msg as string || '').includes('polaris limit')) {
		throw new Error('QQ rate limit caught (polaris limit)');
	}		
	if ((data.msg === 'IMG_ILLEGAL') ||
		(data.msg as string || '').includes('image illegal')) {
		throw new Error('Couldn\'t pass the censorship. Try another photo.');
	}
	if (data.code === 1001) {
		throw new Error('Face not found. Try another photo.');
	}
	if (data.code === -2100) {
		console.error('Invalid request', JSON.stringify(data));
		throw new Error('Try another photo.');
	}
	if (data.code === 2119 || data.code === -2111) {
		console.error('Blocked', JSON.stringify(data));
		throw new Error('Blocked by qq. Change ip location.');
	}
	if (!data.extra) {
		throw new Error('Got no data from QQ: ' + JSON.stringify(data));
	}
	return data;
};

const sendRequest = async (obj: Record<string, unknown>) => {
	const sign = signV1(obj);
	let url = '';
	if (mode === 'DIFFERENT_DIMENSION_ME') {
		url = 'https://ai.tu.qq.com/overseas/trpc.shadow_cv.ai_processor_cgi.AIProcessorCgi/Process';
	}
	if (mode === 'AI_PAINTING_ANIME') {
		url = 'https://ai.tu.qq.com/trpc.shadow_cv.ai_processor_cgi.AIProcessorCgi/Process';
	}
	let data;
	try {
		data = await asyncRetry(
			async () => {
				const response = await axios.request({
					httpsAgent,
					method: 'POST',
					url,
					data: obj,
					headers: {
						'Content-Type': 'application/json',
						'Origin': 'https://h5.tu.qq.com',
						'Referer': 'https://h5.tu.qq.com/',
						'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
						'x-sign-value': sign,
						'x-sign-version': 'v1',
					},
					timeout: 30000,
				});
				const data = checkResponse(response?.data as Record<string, unknown> | undefined);
				return data;
			}, {
				onRetry(e, attempt) {
					console.error(`QQ file upload error caught (attempt #${attempt}): ${e.toString()}`);
				},
				retries: 10,
				factor: 1,
			});
	} catch (e) {
		console.error(`QQ file upload error caught: ${(e as Error).toString()}`);
		throw new Error(`Unable to upload the photo: ${(e as Error).toString()}`);
	}
	return data as Record<string, unknown> & { extra: string };
};

const download = async (url: string): Promise<Buffer> => {
	let data;
	try {
		data = await asyncRetry(
			async () => {
				const response = await axios.request({
					url,
					timeout: 10000,
					responseType: 'arraybuffer',
					httpsAgent,
				});

				if (!response.data) {
					throw new Error('No data');
				}

				return response.data;
			},
			{
				onRetry(e, attempt) {
					console.error(`QQ file download error caught (attempt #${attempt}): ${e.toString()}`);
				},
				retries: 10,
				factor: 1,
			},
		);
	} catch (e) {
		console.error(`QQ file download error caught: ${(e as Error).toString()}`);
		throw new Error(`Unable to download media: ${(e as Error).toString()}`);
	}
	return data;
};

const transformImage = async (args: ITransformArguments) => {
	const imagePath = args.image;
	const outputImagePath = args.output;
	const proxy = args.proxy;
	try {
		if (proxy) {
			httpsAgent = new HttpsProxyAgent(proxy);
		}
		const promise = fs.readFile(path.join(imagePath));
		Promise.resolve(promise).then(async function(buffer) {
			const obj = makeObject(buffer);
			const data = await sendRequest(obj);
			const extra = JSON.parse(data.extra);
			const imgData = await download(extra.img_urls[1] as string);
			fs.writeFile(path.join(outputImagePath), imgData);
			console.log(`Successfully downloaded transformed image to:\n${outputImagePath}`);
		});
	} catch (e) {
		console.error(`Some error occured: ${(e as Error).toString()}`)
	}
};

transformImage(args);