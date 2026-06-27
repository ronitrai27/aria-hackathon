from langgraph.checkpoint.redis import AsyncRedisSaver

async def get_checkpointer(redis_url: str):
    checkpointer = AsyncRedisSaver(redis_url)
    await checkpointer.asetup()  # creates indices, run once/on boot
    return checkpointer
