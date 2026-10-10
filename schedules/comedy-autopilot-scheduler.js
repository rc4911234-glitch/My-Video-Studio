const cron = require('node-cron');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { ComedyChannelAutopilot } = require('../utils/comedy-channel-autopilot');
const { YouTubeUploader } = require('../utils/youtube-uploader');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'comedy-scheduler.log');

function log(msg) {
  const line = `[${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}] ${msg}\n`;
  console.log(line.trim());
  fs.appendFileSync(LOG_FILE, line);
}

class ComedyAutopilotScheduler {
  constructor() {
    this.autopilot = new ComedyChannelAutopilot({ maxAgeHours: 12 });
    this.uploader = new YouTubeUploader();
    this.isRunningCycle = false;
  }

  start() {
    console.log(chalk.cyan.bold('\n🤖 Comedy Channel 100% Autonomous 24/7 Scheduler Started!'));
    console.log(chalk.gray('═'.repeat(65)));
    console.log(chalk.green('Target Channel: Rohit choudhary'));
    console.log(chalk.white('⏰ Slot 1: 1:30 PM IST (Afternoon Lunch Peak)'));
    console.log(chalk.white('⏰ Slot 2: 7:30 PM IST (Evening Peak)'));
    console.log(chalk.white('🔍 Scanner: Har 30 minute me check karega naye 12-hour uploads'));
    console.log(chalk.yellow('⚡ Manual Work: 0% (Fully Autonomous)\n'));

    log('Autopilot Scheduler initialized. Timezone: Asia/Kolkata');

    // Slot 1: 1:30 PM IST (13:30)
    cron.schedule('30 13 * * *', async () => {
      log('⏰ Slot 1 Triggered (1:30 PM IST) - Starting upload cycle...');
      await this.runScheduledCycle(true);
    }, { timezone: 'Asia/Kolkata' });

    // Slot 2: 7:30 PM IST (19:30)
    cron.schedule('30 19 * * *', async () => {
      log('⏰ Slot 2 Triggered (7:30 PM IST) - Starting upload cycle...');
      await this.runScheduledCycle(true);
    }, { timezone: 'Asia/Kolkata' });

    // Background Fresh Content Scanner: Every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
      log('🔍 Checking for fresh 12h creator uploads in background...');
      await this.runScheduledCycle(false); // only upload if strictly fresh 12h
    }, { timezone: 'Asia/Kolkata' });
  }

  async runScheduledCycle(fallbackToRecent = false) {
    if (this.isRunningCycle) {
      log('Cycle already in progress, skipping duplicate run.');
      return;
    }

    this.isRunningCycle = true;
    try {
      const result = await this.autopilot.runCycle({
        force: fallbackToRecent,
        upload: true,
        privacy: 'public'
      });

      if (result && result.upload) {
        log(`🎉 SUCCESS: Video uploaded! URL: ${result.upload.url}`);
        log(`Title: ${result.packaging.title}`);
      } else if (result) {
        log(`Video generated at ${result.bypassedPath}, but not uploaded.`);
      } else {
        log('No video qualified in this cycle (waiting for fresh 12h content).');
      }
    } catch (err) {
      log(`❌ Cycle Error: ${err.message}`);
    } finally {
      this.isRunningCycle = false;
    }
  }
}

// Start Scheduler
if (require.main === module) {
  const scheduler = new ComedyAutopilotScheduler();
  scheduler.start();

  // Keep process alive
  process.on('SIGINT', () => {
    log('Scheduler stopped by user.');
    process.exit(0);
  });
}

module.exports = { ComedyAutopilotScheduler };
