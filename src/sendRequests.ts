import md5 from 'md5';
import axios from 'axios';
import asyncRetry from 'async-retry';
import { HttpsProxyAgent } from 'https-proxy-agent';

const signV1 = async (obj: Record<string, unknown>) => {
	const str = JSON.stringify(obj);
	let encoded = md5(
		'https://h5.tu.qq.com' +
		(str.length + (encodeURIComponent(str).match(/%[89ABab]/g)?.length || 0)) +
		'HQ31X02e',
	);
	return encoded;
};
	
const checkResponse = async(data: Record<string, unknown> | undefined) => {
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

module.exports = {
	
	async sendRequest(obj: Record<string, unknown>, mode: string, httpsAgent: HttpsProxyAgent<string>) {
		const sign = await signV1(obj);
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
					const data = await checkResponse(response?.data as Record<string, unknown> | undefined);
					return data;
				}, {
					onRetry(e, attempt) {
						console.error(`QQ file upload error caught (attempt #${attempt}): ${e.toString()}`);
					},
					retries: 3,
					factor: 1,
				});
		} catch (e) {
			throw new Error((e as Error).toString());
		}
		return data as Record<string, unknown> & { extra: string };
	},

	async download(url: string, httpsAgent: HttpsProxyAgent<string>): Promise<Buffer> {
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
			const error = (e as Error).toString();
			console.error(`QQ file download error caught: ${error}`);
			throw new Error(`Unable to download media: ${error}`);
		}
		return data;
	},
};
