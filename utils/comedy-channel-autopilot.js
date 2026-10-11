const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { AutoViralBypasser } = require('./auto-viral-bypasser');

const HISTORY_FILE = path.join(__dirname, '..', 'data', 'comedy_history.json');

// Top 20 Indian Comedy Creators Pool
const COMEDY_CREATORS = [
  { name: 'Aaryan Kelvin', query: 'Aaryan Kelvin' },
  { name: 'CarryMinati', query: 'CarryMinati' },
  { name: 'Round2Hell', query: 'Round2Hell' },
  { name: 'Harsh Beniwal', query: 'Harsh Beniwal' },
  { name: 'Purav Jha', query: 'Purav Jha' },
  { name: 'BB Ki Vines', query: 'BB Ki Vines' },
  { name: 'The MriDul', query: 'The MriDul comedy' },
  { name: 'Triggered Insaan', query: 'Triggered Insaan funny' },
  { name: 'Fukra Insaan', query: 'Fukra Insaan comedy' },
  { name: 'Ashish Chanchlani', query: 'Ashish Chanchlani' },
  { name: 'Amit Bhadana', query: 'Amit Bhadana' },
  { name: 'Elvish Yadav', query: 'Elvish Yadav comedy' },
  { name: 'Mythpat', query: 'Mythpat funny' },
  { name: 'Samay Raina', query: 'Samay Raina comedy' },
  { name: 'Tanmay Bhat', query: 'Tanmay Bhat funny' },
  { name: 'Zakir Khan', query: 'Zakir Khan standup comedy' },
  { name: 'Harsh Gujral', query: 'Harsh Gujral standup' },
  { name: 'Anubhav Singh Bassi', query: 'Anubhav Singh Bassi standup' },
  { name: 'Abhishek Upmanyu', query: 'Abhishek Upmanyu standup' },
  { name: 'RJ Raunac', query: 'RJ Raunac comedy' }
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
   * Search across top 20 creators:
   * 1. High Priority: Videos uploaded within the last 12 hours.
   * 2. Automatic Fallback: Freshest / top-trending unprocessed comedy video from the pool.
   */
  async findBestCandidateVideo() {
    console.log(chalk.cyan.bold(`\n⏱️ [AUTOPILOT SCAN] Scanning Top 20 Indian Comedy creators for latest content...`));
    const nowSeconds = Math.floor(Date.now() / 1000);
    const maxAgeSeconds = this.maxAgeHours * 3600;

    let fresh12hCandidates = [];
    let recentCandidates = [];

    for (const creator of COMEDY_CREATORS) {
      console.log(chalk.gray(`Checking creator: ${creator.name}...`));
      try {
        const results = await this.bypasser.searchViralVideos(`${creator.query} comedy`, { count: 5, shorts: false });

        for (const video of results) {
          if (this.isAlreadyProcessed(video.id)) continue;

          let isWithin12Hours = false;
          let ageHours = null;

          if (video.timestamp) {
            const ageSeconds = nowSeconds - video.timestamp;
            ageHours = (ageSeconds / 3600).toFixed(1);
            if (ageSeconds <= maxAgeSeconds && ageSeconds >= 0) {
              isWithin12Hours = true;
            }
          }

          const candidate = { ...video, ageHours, creatorName: creator.name };

          if (isWithin12Hours) {
            console.log(chalk.green.bold(`  🔥 12-HOUR FRESH FOUND: [${ageHours}h ago] "${video.title}" by ${creator.name}`));
            fresh12hCandidates.push(candidate);
          } else {
            recentCandidates.push(candidate);
          }
        }
      } catch (err) {
        console.log(chalk.yellow(`  Could not check ${creator.name}: ${err.message}`));
      }

      if (fresh12hCandidates.length >= 3) break;
    }

    if (fresh12hCandidates.length > 0) {
      fresh12hCandidates.sort((a, b) => b.views - a.views);
      console.log(chalk.green.bold(`\n✨ Found ${fresh12hCandidates.length} video(s) within the last 12 hours!`));
      return { video: fresh12hCandidates[0], is12hFresh: true };
    }

    if (recentCandidates.length > 0) {
      console.log(chalk.yellow(`\n⚠️ Pichhle ${this.maxAgeHours} ghante me kisi creator ka naya video nahi mila.`));
      console.log(chalk.magenta(`[Auto-Fallback Active] Top 20 creators me se sabse trending unprocessed video chuni ja rahi hai taaki schedule miss na ho...`));
      // Sort by newest upload timestamp, then highest views
      recentCandidates.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0) || b.views - a.views);
      return { video: recentCandidates[0], is12hFresh: false };
    }

    return null;
  }

  /**
   * Run Comedy Auto-Pilot Cycle
   */
  async runCycle(opts = {}) {
    const options = typeof opts === 'object' && opts !== null ? opts : { force: Boolean(opts) };
    const allowFallback = options.force !== false;
    console.log(chalk.yellow.bold(`\n🎭 Comedy Channel Autopilot Cycle Starting`));
    console.log(chalk.gray('═'.repeat(60)));
    console.log(chalk.cyan(`Target Pool: Top 20 Indian Comedy Creators | Target Duration: 15s Horizontal 16:9`));

    const candidateResult = await this.findBestCandidateVideo();

    let selected = null;
    if (!candidateResult || !candidateResult.video) {
      if (!allowFallback) {
        console.log(chalk.yellow(`\n⚠️ 12 ghante me koi naya video nahi mila. Background scanner wait karega.`));
        return null;
      }
      console.log(chalk.yellow(`\n⚠️ Pool me se koi naya video nahi mila. Emergency viral fallback search...`));
      const emergency = await this.bypasser.searchViralVideos('CarryMinati funny comedy sketch', { count: 10 });
      selected = emergency.find(v => !this.isAlreadyProcessed(v.id)) || emergency[0];
      if (!selected) {
        console.error(chalk.red('Critical: Could not find any video to process.'));
        return null;
      }
    } else {
      if (!candidateResult.is12hFresh && !allowFallback) {
        console.log(chalk.yellow(`\n⚠️ Pichhle 12 ghante me naya video nahi aaya. Background scanner wait karega.`));
        return null;
      }
      selected = candidateResult.video;
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
  const force = !process.argv.includes('--strict-12h');
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
