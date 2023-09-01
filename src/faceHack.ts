import sharp from 'sharp';

module.exports = {
    async faceHack(sourceImgBuffer: Buffer) {
        const FACE_HACK_SIZE = 170;
        const FACE_HACK_SPACE = 200;

        let faceHackBuffer = await sharp(__dirname + '/face_hack/face_hack.jpg')
                            .resize(FACE_HACK_SIZE, FACE_HACK_SIZE)
                            .toBuffer();
                            // .then((resolve, rejectbuffer) => {
                            //     buffer;
                            // });

        const sourceImg = sharp(sourceImgBuffer);
        const sourceImgMeta = await sourceImg.metadata();

        const sourceImgWidth = sourceImgMeta.width || 0;
        const sourceImgHeight = sourceImgMeta.height || 0;

        let imgWidth = sourceImgWidth;
        let imgHeight = sourceImgHeight;
        let img = sourceImg.clone();
        if (sourceImgHeight > sourceImgWidth) {
            const ratio = sourceImgHeight / sourceImgWidth;
            if (ratio > 1.5) {
                imgHeight = Math.floor(sourceImgWidth * 1.5);
            } else {
                imgWidth = Math.floor(sourceImgHeight / 1.5);
            }
        } else {
            const ratio = sourceImgWidth / sourceImgHeight;
            if (ratio > 1.5) {
                imgWidth = Math.floor(sourceImgHeight * 1.5);
            } else {
                imgHeight = Math.floor(sourceImgWidth / 1.5);
            }
        }

        imgWidth = Math.max(imgWidth, FACE_HACK_SIZE);
        imgHeight = Math.max(imgHeight, FACE_HACK_SIZE);

        img = img.resize({
            fit: 'cover',
            width: imgWidth,
            height: imgHeight,
        });

        const imgBuffer = await img.toBuffer();

        let resultImg;
        if (imgHeight > imgWidth) {
            resultImg = sharp({
                create: {
                    width: imgWidth,
                    height: imgHeight + FACE_HACK_SIZE * 2 + FACE_HACK_SPACE * 2,
                    background: { r: 255, g: 255, b: 255 },
                    channels: 3,
                },
            })
                .composite([
                    {
                        input: imgBuffer,
                        left: 0,
                        top: FACE_HACK_SIZE + FACE_HACK_SPACE,
                    },
                    {
                        input: faceHackBuffer,
                        left: Math.round(imgWidth / 2 - FACE_HACK_SIZE / 2),
                        top: 0,
                    },
                    {
                        input: faceHackBuffer,
                        left: Math.round(imgWidth / 2 - FACE_HACK_SIZE / 2),
                        top: FACE_HACK_SIZE + FACE_HACK_SPACE + imgHeight + FACE_HACK_SPACE,
                    },
                ]);
        } else {
            resultImg = sharp({
                create: {
                    width: imgWidth + FACE_HACK_SIZE * 2 + FACE_HACK_SPACE * 2,
                    height: imgHeight,
                    background: { r: 255, g: 255, b: 255 },
                    channels: 3,
                },
            })
                .composite([
                    {
                        input: imgBuffer,
                        left: FACE_HACK_SIZE + FACE_HACK_SPACE,
                        top: 0,
                    },
                    {
                        input: faceHackBuffer,
                        left: 0,
                        top: Math.round(imgHeight / 2 - FACE_HACK_SIZE / 2),
                    },
                    {
                        input: faceHackBuffer,
                        left: FACE_HACK_SIZE + FACE_HACK_SPACE + imgWidth + FACE_HACK_SPACE,
                        top: Math.round(imgHeight / 2 - FACE_HACK_SIZE / 2),
                    },
                ]);
        }

        return await resultImg.jpeg().toBuffer();
    },
};
