from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class NodeType(str, Enum):
    STRATEGY = "strategy"
    PLAN = "plan"
    RESEARCH = "research"
    DOC = "doc"
    CONCEPT = "concept"
    DECISION = "decision"
    INSIGHT = "insight"


class EdgeType(str, Enum):
    RELATES_TO = "relates_to"
    PART_OF = "part_of"
    REFERENCES = "references"
    DEPENDS_ON = "depends_on"
    SUPERSEDES = "supersedes"
    SUPPORTS = "supports"
    CONTRADICTS = "contradicts"


class Node(BaseModel):
    id: Optional[int] = None
    type: NodeType
    title: str
    content: str = ""
    tags: list[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class Edge(BaseModel):
    id: Optional[int] = None
    source_id: int
    target_id: int
    relationship: EdgeType
    label: str = ""
    metadata: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.now)
