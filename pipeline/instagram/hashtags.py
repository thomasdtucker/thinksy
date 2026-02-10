from __future__ import annotations

from ..models import SoftwareCategory
from ..shared.llm import ClaudeClient

HASHTAG_SYSTEM = """You are an Instagram marketing expert specializing in B2B SaaS.
Generate highly relevant hashtags for Instagram Reels promoting business software.
Mix high-volume hashtags (500K+ posts) with niche ones (10K-100K posts) for optimal reach.
Always include category-specific and general business software hashtags."""

HASHTAG_PROMPT = """Generate 20-25 Instagram hashtags for this video ad:

Category: {category}
Hook: {hook}
Script: {script}

Return a JSON array of hashtag strings (without the # symbol).
Order from highest to lowest relevance."""

# Fallback hashtags by category if LLM is unavailable
FALLBACK_HASHTAGS: dict[SoftwareCategory, list[str]] = {
    SoftwareCategory.HR: [
        "HRSoftware", "HumanResources", "HRTech", "PeopleManagement",
        "HRTools", "Payroll", "EmployeeManagement", "SmallBusinessHR",
        "HRAutomation", "Onboarding", "TalentManagement", "WorkforceManagement",
        "BusinessSoftware", "SaaS", "SmallBusiness", "Entrepreneur",
    ],
    SoftwareCategory.ACCOUNTING: [
        "AccountingSoftware", "Bookkeeping", "SmallBusinessAccounting",
        "CloudAccounting", "Invoicing", "FinancialManagement", "CFO",
        "AccountingTools", "BusinessFinance", "TaxPrep", "CashFlow",
        "BusinessSoftware", "SaaS", "SmallBusiness", "Entrepreneur",
    ],
    SoftwareCategory.PROJECT_MANAGEMENT: [
        "ProjectManagement", "PMSoftware", "TeamCollaboration",
        "ProductivityTools", "TaskManagement", "Agile", "WorkManagement",
        "ProjectPlanning", "TeamProductivity", "RemoteWork",
        "BusinessSoftware", "SaaS", "SmallBusiness", "Entrepreneur",
    ],
}


def generate_hashtags(
    llm: ClaudeClient,
    category: SoftwareCategory,
    hook: str,
    script: str,
) -> list[str]:
    try:
        tags = llm.chat_json(
            system=HASHTAG_SYSTEM,
            user=HASHTAG_PROMPT.format(
                category=category.value,
                hook=hook,
                script=script,
            ),
        )
        if isinstance(tags, list) and all(isinstance(t, str) for t in tags):
            return tags
    except Exception:
        pass
    return FALLBACK_HASHTAGS.get(category, FALLBACK_HASHTAGS[SoftwareCategory.PROJECT_MANAGEMENT])
