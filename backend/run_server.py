import asyncio
import uvicorn

if __name__ == "__main__":
    # Windows: psycopg async needs SelectorEventLoop
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000)