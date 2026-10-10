const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { AutoViralBypasser } = require('./auto-viral-bypasser');

const HISTORY_FILE = path.join(__dirname, '..', 'data', 'comedy_history.json');

// Top Indian Comedy Creators Pool
const COMEDY_CREATORS = [
  { name: 'Aaryan Kelvin', query: 'Aaryan Kelvin' },
  { name: 'CarryMinati', query: 'CarryMinati' },
  { name: 'Round2Hell', query: 'Round2Hell' },
  { name: 'Harsh Beniwal', query: 'Harsh Beniwal' },
  { name: 'Purav Jha', query: 'Purav Jha' },
  { name: 'BB Ki Vines', query: 'BB Ki Vines' },
  { name: 'Triggered Insaan', query: 'Triggered Insaan funny' },
  { name: 'Ashish Chanchlani', query: 'Ashish Chanchlani' }
];

class ComedyChannelAutopilot {
  constructor(options = {}) {
    this.maxAgeHours = options.maxAgeHours || 12; // 12-HOUR HARD RULE
    this.bypasser = new AutoViralBypasser();
    this.history = this.loadHistory();
  }

  loadHistory() {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      }
    } catch (e) {
      // return default
    }
    return { processedVideoIds: [], log: [] };
  }

  saveHistory() {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(this.history, null, 2));
  }

  isAlreadyProcessed(videoId) {
    return this.history.processedVideoIds.includes(videoId);
  }

  markProcessed(videoData, bypassedPath) {
    this.history.processedVideoIds.push(videoData.id);
    this.history.log.push({
      id: videoData.id,
      title: videoData.title,
      channel: videoData.channel,
      views: videoData.views,
      uploadedAt: videoData.timestamp ? new Date(videoData.timestamp * 1000).toISOString() : 'unknown',
      processedAt: new Date().toISOString(),
      bypassedPath
    });
    this.saveHistory();
  }

  /**
   * Search for videos uploaded in the last 12 hours across creators pool
   */
  async findFresh12HourVideo() {
    console.log(chalk.cyan.bold(`\n⏱️ [RULE ACTIVE] Searching ONLY for videos uploaded within last ${this.maxAgeHours} Hours...`));
    const nowSeconds = Math.floor(Date.now() / 1000);
    const maxAgeSeconds = this.maxAgeHours * 3600;

    let candidateVideos = [];

    for (const creator of COMEDY_CREATORS) {
      console.log(chalk.gray(`Checking creator: ${creator.name}...`));
      try {
        const results = await this.bypasser.searchViralVideos(`${creator.query} new`, { count: 5, shorts: false });

        for (const video of results) {
          if (this.isAlreadyProcessed(video.id)) continue;

          // Check timestamp if available
          let isWithin12Hours = false;
          let ageHours = null;

          if (video.timestamp) {
            const ageSeconds = nowSeconds - video.timestamp;
            ageHours = (ageSeconds / 3600).toFixed(1);
            if (ageSeconds <= maxAgeSeconds && ageSeconds >= 0) {
              isWithin12Hours = true;
            }
          }

          if (isWithin12Hours) {
            console.log(chalk.green.bold(`  🔥 FRESH FOUND: [${ageHours}h ago] "${video.title}" by ${creator.name}`));
            candidateVideos.push({ ...video, ageHours, creatorName: creator.name });
          }
        }
      } catch (err) {
        console.log(chalk.yellow(`  Could not check ${creator.name}: ${err.message}`));
      }

      if (candidateVideos.length >= 3) break; // found enough candidates
    }

    if (candidateVideos.length > 0) {
      // Sort candidates by highest views
      candidateVideos.sort((a, b) => b.views - a.views);
      return candidateVideos[0];
    }

    return null;
  }

  /**
   * Run Comedy Auto-Pilot Cycle
   */
  async runCycle(forceLatestIfNone = false) {
    console.log(chalk.yellow.bold(`\n🎭 Comedy Channel Autopilot Cycle Starting`));
    console.log(chalk.gray('═'.repeat(60)));
    console.log(chalk.cyan(`Rule: Only videos uploaded within last ${this.maxAgeHours} hours.`));

    let selected = await this.findFresh12HourVideo();

    if (!selected) {
      console.log(chalk.yellow(`\n⚠️ Pichhle ${this.maxAgeHours} ghante me target creators ka koi naya video nahi mila.`));
      if (!forceLatestIfNone) {
        console.log(chalk.cyan(`Autopilot wait karega jab tak koi creator 12 ghante me naya video na daale.`));
        return null;
      } else {
        console.log(chalk.magenta(`[Fallback Mode] Sabse recent trending comedy video pick kar rahe hain...`));
        const trending = await this.bypasser.searchViralVideos('Aaryan Kelvin comedy shorts', { count: 5 });
        selected = trending.find(v => !this.isAlreadyProcessed(v.id)) || trending[0];
      }
    }

    console.log(chalk.green.bold(`\n🎯 Selected Comedy Video to Bypass:`));
    console.log(chalk.white(`  Title: ${selected.title}`));
    console.log(chalk.white(`  Creator: ${selected.channel || selected.creatorName || 'Comedy Creator'}`));
    console.log(chalk.white(`  Views: ${selected.views.toLocaleString()}`));
    console.log(chalk.white(`  URL: ${selected.url}`));

    // Step 2: Download & auto-clip
    const downloadedPath = await this.bypasser.downloadVideo(selected.url, selected.id, selected.duration);

    // Step 3: Bypass Algorithm
    const bypassedPath = await this.bypasser.bypassTransform(downloadedPath, selected.id, { speed: 1.06 });

    // Step 4: Generate Viral SEO Title & Tags
    const viralPackaging = this.generateViralPackaging(selected);

    // Step 5: Mark processed in history
    this.markProcessed(selected, bypassedPath);

    console.log(chalk.gray('═'.repeat(60)));
    console.log(chalk.green.bold(`🎉 Video Ready for Comedy Channel!`));
    console.log(chalk.white(`📁 Video Path: ${bypassedPath}`));
    console.log(chalk.cyan(`🏷️ Viral Title: ${viralPackaging.title}`));
    console.log(chalk.gray(`📝 Description: ${viralPackaging.description}`));
    console.log(chalk.gray(`🏷️ Tags: ${viralPackaging.tags.join(', ')}`));

    // Optional Auto-Upload
    let uploadResult = null;
    if (options.upload) {
      try {
        const { YouTubeUploader } = require('./youtube-uploader');
        const uploader = new YouTubeUploader();
        uploadResult = await uploader.uploadVideo(bypassedPath, {
          title: viralPackaging.title,
          description: viralPackaging.description,
          tags: viralPackaging.tags,
          privacy: options.privacy || 'public'
        });
      } catch (err) {
        console.error(chalk.red('Auto-upload error:'), err.message);
      }
    }

    return {
      video: selected,
      bypassedPath,
      packaging: viralPackaging,
      upload: uploadResult
    };
  }

  generateViralPackaging(video) {
    const creator = video.creatorName || video.channel || 'Comedy';
    const cleanTitle = video.title.replace(/[#|].*$/g, '').trim().slice(0, 50);

    const title = `${cleanTitle} 😂🔥 | ${creator} Savage Moment #shorts #comedy #viral`;
    const description = `${cleanTitle}\n\nDon't forget to Like & Subscribe for daily laughs! 😂\n\n#shorts #comedy #funny #viral #trending #${creator.replace(/\s+/g, '')} #memes`;
    const tags = ['shorts', 'comedy', 'funny', 'viral', 'memes', 'entertainment', creator.toLowerCase(), 'trending shorts'];

    return { title, description, tags };
  }
}

// CLI Execution
if (require.main === module) {
  const force = process.argv.includes('--force');
  const upload = process.argv.includes('--upload');
  const privacy = process.argv.includes('--private') ? 'private' : 'public';
  const autopilot = new ComedyChannelAutopilot({ maxAgeHours: 12 });

  autopilot.runCycle({ force, upload, privacy })
    .then(result => {
      if (result) {
        console.log(chalk.green.bold('\nCycle completed successfully!'));
      } else {
        console.log(chalk.yellow('\nNo fresh video within 12h. Use --force to pick recent viral instead.'));
      }
      process.exit(0);
    })
    .catch(err => {
      console.error(chalk.red('\nCycle failed:'), err);
      process.exit(1);
    });
}

module.exports = { ComedyChannelAutopilot, COMEDY_CREATORS };
