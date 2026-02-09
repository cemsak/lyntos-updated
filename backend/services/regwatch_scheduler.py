"""
RegWatch Scheduler - Canlı Mod
Periodic scraping, RSS parsing, mevzuat bridge scheduler.

Jobs:
- 15dk: Web scraping (GIB, RG, TURMOB, SGK)
- 30dk: RSS parsing (TURMOB feeds)
- Günlük 06:00: Kapsamlı scrape (7 gün)
- Günlük 07:00: Mevzuat bridge sync (events → mevzuat_refs)
- Saatlik: Parametre değişiklik tespiti
- 4 saatlik: Kaynak tazelik kontrolü
"""

import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.interval import IntervalTrigger
    from apscheduler.triggers.cron import CronTrigger
    APSCHEDULER_AVAILABLE = True
except ImportError:
    APSCHEDULER_AVAILABLE = False
    BackgroundScheduler = None

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.regwatch_scraper import run_all_scrapers, detect_parameter_changes
from services.regwatch_rss_parser import parse_all_rss_feeds
from services.mevzuat_bridge import sync_events_to_mevzuat
from database.db import get_connection

logger = logging.getLogger(__name__)


class RegWatchScheduler:
    """
    Scheduler for RegWatch periodic scraping tasks.

    Manages background jobs for:
    - Periodic scraping of GIB, Resmi Gazete, TURMOB, SGK
    - Parameter change detection
    - Source freshness monitoring
    """

    def __init__(self):
        self.scheduler: Optional[BackgroundScheduler] = None
        self.is_running = False
        self.last_scrape_result = None

    def start(self):
        """Start the scheduler with configured jobs"""
        if not APSCHEDULER_AVAILABLE:
            logger.warning("APScheduler not available. Scheduler disabled.")
            return False

        if self.is_running:
            logger.warning("Scheduler already running")
            return False

        try:
            self.scheduler = BackgroundScheduler(
                job_defaults={
                    'coalesce': True,  # Combine missed runs
                    'max_instances': 1,  # Only one instance per job
                    'misfire_grace_time': 300  # 5 min grace period
                }
            )

            # Add scraping job - every 15 minutes
            self.scheduler.add_job(
                self._scrape_job,
                IntervalTrigger(minutes=15),
                id='regwatch_scrape_15min',
                name='RegWatch 15-minute Scrape',
                replace_existing=True
            )

            # Add daily comprehensive scrape at 6 AM
            self.scheduler.add_job(
                self._daily_scrape_job,
                CronTrigger(hour=6, minute=0),
                id='regwatch_daily_scrape',
                name='RegWatch Daily Comprehensive Scrape',
                replace_existing=True
            )

            # Add RSS parsing - every 30 minutes
            self.scheduler.add_job(
                self._rss_parse_job,
                IntervalTrigger(minutes=30),
                id='regwatch_rss_parse',
                name='RegWatch RSS Feed Parse',
                replace_existing=True
            )

            # Add mevzuat bridge sync - daily at 7 AM
            self.scheduler.add_job(
                self._mevzuat_bridge_job,
                CronTrigger(hour=7, minute=0),
                id='mevzuat_bridge_sync',
                name='Mevzuat Bridge Daily Sync',
                replace_existing=True
            )

            # Add parameter change detection - every hour
            self.scheduler.add_job(
                self._detect_changes_job,
                IntervalTrigger(hours=1),
                id='regwatch_detect_changes',
                name='RegWatch Parameter Change Detection',
                replace_existing=True
            )

            # Add source freshness check - every 4 hours
            self.scheduler.add_job(
                self._check_freshness_job,
                IntervalTrigger(hours=4),
                id='regwatch_check_freshness',
                name='RegWatch Source Freshness Check',
                replace_existing=True
            )

            self.scheduler.start()
            self.is_running = True
            logger.info("RegWatch Scheduler started successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to start scheduler: {e}")
            return False

    def stop(self):
        """Stop the scheduler"""
        if self.scheduler and self.is_running:
            self.scheduler.shutdown(wait=False)
            self.is_running = False
            logger.info("RegWatch Scheduler stopped")

    def _scrape_job(self):
        """Run periodic scrape (15-minute interval)"""
        logger.info("Running scheduled scrape (15-min)")
        try:
            result = run_all_scrapers(days=1, demo_mode=False)
            self.last_scrape_result = {
                'timestamp': datetime.now().isoformat(),
                'type': '15min',
                'result': result
            }
            logger.info(f"Scheduled scrape complete: {result['total_events']} events")
        except Exception as e:
            logger.error(f"Scheduled scrape failed: {e}")

    def _daily_scrape_job(self):
        """Run comprehensive daily scrape (6 AM)"""
        logger.info("Running daily comprehensive scrape")
        try:
            result = run_all_scrapers(days=7, demo_mode=False)
            self.last_scrape_result = {
                'timestamp': datetime.now().isoformat(),
                'type': 'daily',
                'result': result
            }
            logger.info(f"Daily scrape complete: {result['total_events']} events")
        except Exception as e:
            logger.error(f"Daily scrape failed: {e}")

    def _rss_parse_job(self):
        """Run RSS feed parsing (30-minute interval)"""
        logger.info("Running scheduled RSS parse")
        try:
            result = parse_all_rss_feeds()
            logger.info(
                f"RSS parse complete: {result.get('total_events', 0)} events, "
                f"{result.get('total_saved', 0)} new"
            )
        except Exception as e:
            logger.error(f"Scheduled RSS parse failed: {e}")

    def _mevzuat_bridge_job(self):
        """Run mevzuat bridge sync (daily at 7 AM)"""
        logger.info("Running mevzuat bridge sync")
        try:
            result = sync_events_to_mevzuat()
            logger.info(
                f"Mevzuat bridge complete: {result.get('synced', 0)} synced, "
                f"{result.get('skipped_duplicate', 0)} duplicates"
            )
        except Exception as e:
            logger.error(f"Mevzuat bridge sync failed: {e}")

    def _detect_changes_job(self):
        """Run parameter change detection"""
        logger.info("Running parameter change detection")
        try:
            changes = detect_parameter_changes()
            if changes:
                logger.info(f"Detected {len(changes)} potential parameter changes")
                # Log changes for review
                for change in changes:
                    logger.info(f"  - {change['param_category']}/{change['param_key']}: {change['change_type']}")
        except Exception as e:
            logger.error(f"Change detection failed: {e}")

    def _check_freshness_job(self):
        """Check source freshness and alert on stale sources"""
        logger.info("Checking source freshness")
        try:
            with get_connection() as conn:
                cursor = conn.cursor()

                # Find sources that haven't been scraped recently
                cursor.execute("""
                    SELECT source_name, source_url, scrape_frequency, last_scraped_at
                    FROM regulatory_sources
                    WHERE is_active = 1
                    AND (
                        last_scraped_at IS NULL
                        OR datetime(last_scraped_at) < datetime('now', '-' || (scrape_frequency * 2) || ' minutes')
                    )
                """)

                stale_sources = cursor.fetchall()

                if stale_sources:
                    logger.warning(f"Found {len(stale_sources)} stale sources:")
                    for source in stale_sources:
                        logger.warning(f"  - {source[0]}: last scraped {source[3] or 'never'}")

        except Exception as e:
            logger.error(f"Freshness check failed: {e}")

    def get_status(self) -> dict:
        """Get scheduler status"""
        status = {
            'is_running': self.is_running,
            'scheduler_available': APSCHEDULER_AVAILABLE,
            'last_scrape': self.last_scrape_result,
            'jobs': []
        }

        if self.scheduler and self.is_running:
            for job in self.scheduler.get_jobs():
                status['jobs'].append({
                    'id': job.id,
                    'name': job.name,
                    'next_run': job.next_run_time.isoformat() if job.next_run_time else None
                })

        return status

    def run_now(self, job_type: str = 'scrape') -> dict:
        """Manually trigger a job"""
        if job_type == 'scrape':
            self._scrape_job()
        elif job_type == 'daily':
            self._daily_scrape_job()
        elif job_type == 'rss':
            self._rss_parse_job()
        elif job_type == 'bridge':
            self._mevzuat_bridge_job()
        elif job_type == 'detect':
            self._detect_changes_job()
        elif job_type == 'freshness':
            self._check_freshness_job()
        else:
            return {'error': f'Unknown job type: {job_type}'}

        return {'status': 'completed', 'job_type': job_type}


# Singleton instance
regwatch_scheduler = RegWatchScheduler()


def start_scheduler():
    """Start the RegWatch scheduler"""
    return regwatch_scheduler.start()


def stop_scheduler():
    """Stop the RegWatch scheduler"""
    regwatch_scheduler.stop()


def get_scheduler_status():
    """Get scheduler status"""
    return regwatch_scheduler.get_status()


if __name__ == "__main__":
    # Test scheduler
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    print("Starting RegWatch Scheduler...")
    start_scheduler()

    print("\nScheduler Status:")
    import json
    print(json.dumps(get_scheduler_status(), indent=2, default=str))

    print("\nPress Ctrl+C to stop...")
    try:
        import time
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping scheduler...")
        stop_scheduler()
