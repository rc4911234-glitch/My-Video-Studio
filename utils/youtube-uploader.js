const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const chalk = require('chalk');

class YouTubeUploader {
  constructor() {
    this.credentialsPath = path.join(__dirname, '..', 'config', 'credentials.json');
    this.tokensPath = path.join(__dirname, '..', 'config', 'tokens.json');
    this.youtube = null;
  }

  async init() {
    if (!fs.existsSync(this.credentialsPath) || !fs.existsSync(this.tokensPath)) {
      throw new Error('Credentials ya tokens missing hain. Pehle OAuth complete karein.');
    }

    const credentials = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));
    const tokens = JSON.parse(fs.readFileSync(this.tokensPath, 'utf8'));

    const oauth2Client = new google.auth.OAuth2(
      credentials.youtube.client_id,
      credentials.youtube.client_secret
    );

    oauth2Client.setCredentials(tokens.youtube || tokens);
    this.youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    return this.youtube;
  }

  /**
   * Upload video file to YouTube
   */
  async uploadVideo(videoPath, metadata = {}) {
    await this.init();

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file nahi mili: ${videoPath}`);
    }

    const title = metadata.title || 'Viral Comedy Short 😂 #shorts #comedy';
    const description = metadata.description || 'Watch till the end! 😂 Like and subscribe for more daily comedy shorts!\n\n#shorts #comedy #viral #funny';
    const tags = metadata.tags || ['shorts', 'comedy', 'funny', 'viral', 'entertainment'];
    const privacyStatus = metadata.privacy || 'public'; // 'public', 'private', or 'unlisted'

    console.log(chalk.cyan.bold('\n📤 YouTube Video Uploading...'));
    console.log(chalk.white(`  File: ${videoPath}`));
    console.log(chalk.white(`  Title: ${title}`));
    console.log(chalk.white(`  Privacy: ${privacyStatus}`));

    const fileSize = fs.statSync(videoPath).size;
    console.log(chalk.gray(`  Size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`));

    const res = await this.youtube.videos.insert({
      part: ['snippet', 'status'],
      notifySubscribers: true,
      requestBody: {
        snippet: {
          title: title.slice(0, 100),
          description: description.slice(0, 5000),
          tags: tags,
          categoryId: '23', // Comedy
          defaultLanguage: 'hi',
          defaultAudioLanguage: 'hi'
        },
        status: {
          privacyStatus: privacyStatus,
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: fs.createReadStream(videoPath)
      }
    });

    const videoId = res.data.id;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const shortsUrl = `https://www.youtube.com/shorts/${videoId}`;

    console.log(chalk.green.bold('\n🎉 Video Successfully Uploaded to YouTube!'));
    console.log(chalk.cyan(`🔗 YouTube Watch URL: ${videoUrl}`));
    console.log(chalk.yellow(`📱 YouTube Shorts URL: ${shortsUrl}\n`));

    return {
      id: videoId,
      url: videoUrl,
      shortsUrl: shortsUrl,
      title: title
    };
  }
}

// CLI Execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const videoFile = args[0] || path.join(__dirname, '..', 'data', 'videos', 'bypassed_Eo5MFjMTmmA.mp4');
  const privacy = args[1] || 'public';

  const uploader = new YouTubeUploader();
  uploader.uploadVideo(videoFile, {
    title: 'Aaryan Kelvin Savage School Life Moment 😂🔥 #shorts #comedy #viral',
    privacy: privacy
  })
    .then(() => {
      console.log(chalk.green('Done!'));
      process.exit(0);
    })
    .catch(err => {
      console.error(chalk.red('Upload failed:'), err.message);
      process.exit(1);
    });
}

module.exports = { YouTubeUploader };
