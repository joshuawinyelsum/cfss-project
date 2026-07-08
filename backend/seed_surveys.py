import asyncio
import json
from app.database import SessionLocal
from app.models import SurveyQuestion

questions_data = [
    # HOUSEHOLD SURVEY
    {
        "survey_type": "HOUSEHOLD",
        "section": "Demographics",
        "question_text": "Household Head Name",
        "question_type": "text",
        "options": None,
        "required": True,
        "order_number": 1
    },
    {
        "survey_type": "HOUSEHOLD",
        "section": "Demographics",
        "question_text": "Age",
        "question_type": "number",
        "options": None,
        "required": True,
        "order_number": 2
    },
    {
        "survey_type": "HOUSEHOLD",
        "section": "Demographics",
        "question_text": "Gender",
        "question_type": "radio",
        "options": ["Male", "Female"],
        "required": True,
        "order_number": 3
    },
    {
        "survey_type": "HOUSEHOLD",
        "section": "Economic Activity",
        "question_text": "Occupation",
        "question_type": "text",
        "options": None,
        "required": True,
        "order_number": 4
    },
    {
        "survey_type": "HOUSEHOLD",
        "section": "Dwelling Characteristics",
        "question_text": "Type of Dwelling",
        "question_type": "select",
        "options": ["Block/Concrete", "Mud", "Wood", "Other"],
        "required": True,
        "order_number": 5
    },

    # EDUCATION SURVEY
    {
        "survey_type": "EDUCATION",
        "section": "General Information",
        "question_text": "School Name",
        "question_type": "text",
        "options": None,
        "required": True,
        "order_number": 1
    },
    {
        "survey_type": "EDUCATION",
        "section": "General Information",
        "question_text": "School Level",
        "question_type": "select",
        "options": ["Primary", "JHS", "SHS"],
        "required": True,
        "order_number": 2
    },
    {
        "survey_type": "EDUCATION",
        "section": "Staffing",
        "question_text": "Total Number of Teachers",
        "question_type": "number",
        "options": None,
        "required": True,
        "order_number": 3
    },

    # HEALTH SURVEY
    {
        "survey_type": "HEALTH",
        "section": "Facility Overview",
        "question_text": "Facility Name",
        "question_type": "text",
        "options": None,
        "required": True,
        "order_number": 1
    },
    {
        "survey_type": "HEALTH",
        "section": "Facility Overview",
        "question_text": "Facility Type",
        "question_type": "select",
        "options": ["CHPS Compound", "Clinic", "Hospital"],
        "required": True,
        "order_number": 2
    },
    {
        "survey_type": "HEALTH",
        "section": "Services",
        "question_text": "Is there a resident doctor?",
        "question_type": "radio",
        "options": ["Yes", "No"],
        "required": True,
        "order_number": 3
    },

    # GOVERNANCE SURVEY
    {
        "survey_type": "GOVERNANCE",
        "section": "Leadership",
        "question_text": "Name of Chief or Opinion Leader",
        "question_type": "text",
        "options": None,
        "required": True,
        "order_number": 1
    },
    {
        "survey_type": "GOVERNANCE",
        "section": "Leadership",
        "question_text": "Assembly Member Name",
        "question_type": "text",
        "options": None,
        "required": True,
        "order_number": 2
    },
]

async def seed_questions():
    async with SessionLocal() as session:
        for q_data in questions_data:
            # Check if exists
            from sqlalchemy import select
            stmt = select(SurveyQuestion).where(
                SurveyQuestion.survey_type == q_data["survey_type"],
                SurveyQuestion.question_text == q_data["question_text"]
            )
            result = await session.execute(stmt)
            if not result.scalars().first():
                question = SurveyQuestion(**q_data)
                session.add(question)
        
        await session.commit()
        print("Questions seeded successfully.")

if __name__ == "__main__":
    asyncio.run(seed_questions())
