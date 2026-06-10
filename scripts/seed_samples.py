#!/usr/bin/env python3
"""Seed sample essays into ChromaDB for the AI Writing Service RAG pipeline.

Usage:
    python scripts/seed_samples.py [--host localhost] [--port 8000] [--db-url mysql+aiomysql://...]

Requires:
    - ChromaDB running
    - sentence-transformers installed
    - MySQL DB with writing_sample_answers table populated
"""

import argparse
import sys

from chromadb import HttpClient
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction


def main():
    parser = argparse.ArgumentParser(description="Seed writing samples into ChromaDB")
    parser.add_argument("--host", default="localhost", help="ChromaDB host")
    parser.add_argument("--port", type=int, default=5184, help="ChromaDB port")
    parser.add_argument("--model", default="all-mpnet-base-v2", help="Embedding model name")
    parser.add_argument("--db-url", default=None, help="MySQL connection URL (optional, for loading from DB)")
    parser.add_argument("--reset", action="store_true", help="Delete existing collection and recreate")
    args = parser.parse_args()

    print(f"Connecting to ChromaDB at {args.host}:{args.port}...")
    client = HttpClient(host=args.host, port=args.port)

    collection_name = "writing_samples"
    if args.reset:
        try:
            client.delete_collection(collection_name)
            print(f"Deleted existing collection '{collection_name}'")
        except Exception:
            pass

    collection = client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )

    if args.db_url:
        print(f"Loading samples from database: {args.db_url}")
        try:
            import asyncio
            from sqlalchemy import text
            from sqlalchemy.ext.asyncio import create_async_engine

            async def load_from_db():
                engine = create_async_engine(args.db_url)
                async with engine.connect() as conn:
                    result = await conn.execute(text("""
                        SELECT sa.id, sa.answer_text, sa.band_score,
                               COALESCE(sa.annotation, '') as examiner_comment,
                               wp.prompt_text, COALESCE(wp.topic, '') as topic,
                               wt.code as task_type,
                               COALESCE(sa.word_count, LENGTH(sa.answer_text) / 5) as word_count
                        FROM writing_sample_answers sa
                        LEFT JOIN writing_prompts wp ON sa.writing_prompt_id = wp.id
                        LEFT JOIN writing_tasks wt ON wp.writing_task_id = wt.id
                        WHERE sa.answer_text IS NOT NULL AND sa.answer_text != ''
                        ORDER BY sa.band_score DESC
                    """))
                    rows = result.fetchall()
                    print(f"Found {len(rows)} sample essays in database")

                    if len(rows) == 0:
                        print("No samples found in DB. Adding demo samples for testing...")
                        return add_demo_samples(collection, args.model)

                    model = DefaultEmbeddingFunction()
                    ids = []
                    embeddings = []
                    documents = []
                    metadatas = []

                    batch_size = 50
                    for i, row in enumerate(rows):
                        essay_text = row[1] or ""
                        band_score = float(row[2] or 0)
                        comment = row[3] or ""
                        prompt_text = row[4] or ""
                        topic = row[5] or ""
                        task_type = row[6] or "TASK2_ACADEMIC"
                        if task_type in ("TASK1", "TASK2"):
                            task_type += "_ACADEMIC"
                        word_count = int(row[7] or 0)

                        doc_text = f"Task: {task_type} | Band: {band_score} | Prompt: {prompt_text[:200]} | Essay: {essay_text[:800]}"
                        embedding = model([doc_text])[0]

                        ids.append(str(row[0]))
                        embeddings.append(embedding)
                        documents.append(doc_text)
                        metadatas.append({
                            "task_type": task_type,
                            "topic": topic,
                            "prompt_text": prompt_text[:500],
                            "essay_text": essay_text,
                            "band_score": band_score,
                            "examiner_comment": comment,
                            "has_comment": str(bool(comment)),
                            "word_count": word_count,
                        })

                        if (i + 1) % batch_size == 0 or i == len(rows) - 1:
                            collection.upsert(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)
                            print(f"  Indexed {i + 1}/{len(rows)} samples...")
                            ids, embeddings, documents, metadatas = [], [], [], []

                    print(f"Successfully indexed {len(rows)} samples into ChromaDB!")
                await engine.dispose()

            asyncio.run(load_from_db())
            return

        except Exception as e:
            print(f"Warning: Could not load from database: {e}")
            print("Falling back to demo samples...")

    add_demo_samples(collection, args.model)


def add_demo_samples(collection, model_name):
    print("Loading ONNX embedding model (all-MiniLM-L6-v2)...")
    model = DefaultEmbeddingFunction()

    demos = [
        {"task_type": "TASK2_ACADEMIC", "topic": "Technology", "prompt_text": "Some people believe that technology has made our lives more complex. To what extent do you agree or disagree?",
         "essay_text": "In recent years, technological advancements have transformed every aspect of our lives. While some argue that this has led to greater complexity, I believe the benefits far outweigh any perceived drawbacks. Technology has simplified communication, improved access to information, and automated mundane tasks. For instance, smartphones allow us to connect instantly with anyone worldwide, while search engines provide answers within seconds. Additionally, smart home devices automate daily chores, giving us more leisure time. However, it is true that constant connectivity can cause stress, and keeping up with rapid changes can feel overwhelming. Nevertheless, these challenges are minor compared to the unprecedented convenience technology offers. In conclusion, while technology brings some complexity, it ultimately simplifies our lives in fundamental ways.",
         "band_score": 7.5, "examiner_comment": "Good essay with clear position and relevant examples. Some minor coherence issues in the middle paragraph but overall well-structured. Vocabulary is adequate with some less common items. Grammar is generally accurate with a few minor errors."},
        {"task_type": "TASK2_ACADEMIC", "topic": "Education", "prompt_text": "University education should be free for everyone. Do you agree or disagree?",
         "essay_text": "The debate over free university education is complex. I partially agree that higher education should be accessible, but I disagree that it should be entirely free. On one hand, free education would ensure equal opportunities regardless of socioeconomic background. Countries like Germany demonstrate this model can work. However, completely free education may devalue degrees and strain government budgets. A better approach is a middle ground: heavily subsidized tuition with income-based repayment plans. This ensures accessibility while maintaining accountability and quality standards.",
         "band_score": 6.0, "examiner_comment": "Adequate response addressing the question with a balanced view. Ideas are relevant but could be more fully developed. Paragraph structure is present but cohesion between ideas could be smoother. Some range in vocabulary but occasional imprecision. Grammar is mostly accurate with some errors in complex structures."},
        {"task_type": "TASK2_ACADEMIC", "topic": "Environment", "prompt_text": "Climate change is the biggest threat facing humanity today. Discuss.",
         "essay_text": "Climate change represents an existential threat to human civilization, and I strongly agree that it is the most significant challenge we face. The overwhelming scientific consensus confirms that rising global temperatures, caused primarily by human activities, are leading to catastrophic consequences. These include more frequent extreme weather events, rising sea levels threatening coastal communities, and disruptions to food and water security. While other threats like nuclear war or pandemics are serious, climate change is unique in its global scale and long-term irreversibility. Addressing this crisis requires unprecedented international cooperation and a fundamental transformation of our energy and economic systems. The window for action is closing rapidly, and failure to act decisively will have devastating consequences for future generations.",
         "band_score": 8.0, "examiner_comment": "Excellent essay demonstrating sophisticated understanding. Position is clear and well-supported throughout. Ideas are logically developed with effective progression. Wide vocabulary range with skilful use of less common items. Complex structures used flexibly and accurately."},
        {"task_type": "TASK1_ACADEMIC", "topic": "Charts", "prompt_text": "The chart shows the percentage of households with internet access in five countries from 2005 to 2020.",
         "essay_text": "The bar chart illustrates the proportion of households with internet connectivity across five nations between 2005 and 2020. Overall, internet access increased significantly in all countries over the period. South Korea consistently maintained the highest percentage, rising from 80% to 98%. The most dramatic growth occurred in India, where household internet access surged from just 5% to 65%. The UK and USA showed similar patterns, both reaching approximately 90% by 2020. Brazil experienced steady but slower growth, from 15% to 70%. It is clear that the digital divide narrowed considerably during this 15-year period, though significant gaps remain between developed and developing nations.",
         "band_score": 7.0, "examiner_comment": "Clear overview with key features highlighted. Information is logically presented with good use of data. Some variety in vocabulary though could use more precise statistical language. Sentence structures are varied but occasional minor errors in complex sentences."},
        {"task_type": "TASK2_ACADEMIC", "topic": "Health", "prompt_text": "Governments should tax unhealthy food to encourage healthier eating. To what extent do you agree?",
         "essay_text": "I agree to a large extent that taxing unhealthy food is a necessary measure to promote public health. Obesity rates have risen dramatically in many countries, and this correlates with increased consumption of processed foods high in sugar, salt, and fat. A tax on such products would discourage consumption while generating revenue that could fund health education programs. However, taxation alone is insufficient. Governments must also ensure healthy food is affordable and accessible, particularly in low-income communities where unhealthy options are often the cheapest. Additionally, education campaigns are essential to help people make informed choices. In conclusion, while food taxes are an important tool, they should be part of a broader strategy including education and improved access to healthy food.",
         "band_score": 6.5, "examiner_comment": "Good response with a clear position. Ideas are relevant and reasonably developed. Some good vocabulary but occasional repetition. Grammar is generally accurate with some variety in sentence structures. Could benefit from more specific examples and data."},
    ]

    ids = []
    embeddings = []
    documents = []
    metadatas = []

    for i, d in enumerate(demos):
        doc_text = f"Task: {d['task_type']} | Band: {d['band_score']} | Prompt: {d['prompt_text'][:200]} | Essay: {d['essay_text'][:800]}"
        emb = model([doc_text])[0]

        ids.append(str(i + 1))
        embeddings.append(emb)
        documents.append(doc_text)
        metadatas.append({
            "task_type": d["task_type"],
            "topic": d["topic"],
            "prompt_text": d["prompt_text"],
            "essay_text": d["essay_text"],
            "band_score": d["band_score"],
            "examiner_comment": d["examiner_comment"],
            "has_comment": "True",
            "word_count": len(d["essay_text"].split()),
        })

    collection.upsert(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)
    print(f"Successfully indexed {len(demos)} demo samples into ChromaDB!")


if __name__ == "__main__":
    main()
