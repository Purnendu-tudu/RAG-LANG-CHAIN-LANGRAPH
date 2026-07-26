import os
import sys
import logging
import warnings
from rag_graph import setup_retriever, create_rag_graph

# Suppress verbose warnings for clean terminal presentation
warnings.filterwarnings("ignore", category=UserWarning)
logging.getLogger("transformers").setLevel(logging.ERROR)
logging.getLogger("httpx").setLevel(logging.ERROR)
os.environ["TOKENIZERS_PARALLELISM"] = "false"


def run_rag_query(app, question: str):
    print("\n" + "─" * 60)
    print(f"❓ QUESTION: {question}")
    print("─" * 60)

    result = app.invoke({"question": question})

    print("\n📚 RETRIEVED SOURCES:")
    for idx, doc in enumerate(result.get("documents", []), 1):
        clean_content = doc.page_content.strip().replace("\n", " ")
        print(f"  [{idx}] {clean_content[:150]}...")

    generation = result.get("generation", "")
    if isinstance(generation, list):
        generation_str = "".join([str(item) for item in generation])
    else:
        generation_str = str(generation)

    print("\n🤖 ANSWER:")
    print(f"{generation_str.strip()}\n")
    print("─" * 60)


def main():
    provider = os.getenv("LLM_PROVIDER", "google").lower()
    knowledge_base_path = os.path.join(os.path.dirname(__file__), "sample_data", "knowledge_base.txt")

    print("\n" + "=" * 60)
    print("           LangChain & LangGraph RAG System           ")
    print("=" * 60)
    print(f" Active Provider: {provider.upper()}")
    print(" Loading knowledge base index...")
    
    retriever = setup_retriever(knowledge_base_path)
    app = create_rag_graph(retriever, provider=provider)

    print(" Ready!\n" + "=" * 60)
    print("Type your question below (or 'exit' / 'quit' to stop):\n")

    # Interactive Loop
    while True:
        try:
            user_input = input("Question > ").strip()
            if not user_input:
                continue
            if user_input.lower() in ["exit", "quit", "q"]:
                print("\nExiting RAG application. Goodbye!")
                break
            run_rag_query(app, user_input)
        except (KeyboardInterrupt, EOFError):
            print("\nExiting RAG application. Goodbye!")
            break


if __name__ == "__main__":
    main()
