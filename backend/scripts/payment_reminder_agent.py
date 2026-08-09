"""
CLI entry point for the payment reminder agent.

Usage:
    DATABASE_URL=<sandbox-db> python3 scripts/payment_reminder_agent.py            # dry run (default)
    DATABASE_URL=<sandbox-db> python3 scripts/payment_reminder_agent.py --live     # actually send

Run this from the backend/ directory so the `app` package resolves.
"""
import argparse
import asyncio
import sys

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.services.reminder_agent import run_payment_reminder_scan


async def main(dry_run: bool) -> None:
    async with AsyncSessionLocal() as session:
        decisions = await run_payment_reminder_scan(session, dry_run=dry_run)

    if not decisions:
        print("沒有堂數偏低、需要提醒的學生。")
        return

    print(f"共掃描到 {len(decisions)} 位需要處理的學生：\n")
    for d in decisions:
        print(f"[{d.action}] {d.student_name}（剩 {d.remaining_lessons} 堂 / {d.plan_name}）")
        print(f"    {d.detail}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="Actually send reminders instead of a dry run")
    args = parser.parse_args()

    db_uri = settings.SQLALCHEMY_DATABASE_URI
    if args.live and "localhost" not in db_uri and "127.0.0.1" not in db_uri:
        print("拒絕執行：--live 模式只能對 localhost 的 sandbox 資料庫執行。", file=sys.stderr)
        sys.exit(1)

    asyncio.run(main(dry_run=not args.live))
