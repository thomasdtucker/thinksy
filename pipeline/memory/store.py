from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

from .models import Edge, EdgeType, Node, NodeType

SCHEMA = """
CREATE TABLE IF NOT EXISTS nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS edges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL,
    label TEXT DEFAULT '',
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_id, target_id, relationship)
);

CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
CREATE INDEX IF NOT EXISTS idx_nodes_title ON nodes(title);
CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);
CREATE INDEX IF NOT EXISTS idx_edges_relationship ON edges(relationship);

CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
    title, content, tags, content='nodes', content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS nodes_ai AFTER INSERT ON nodes BEGIN
    INSERT INTO nodes_fts(rowid, title, content, tags)
    VALUES (new.id, new.title, new.content, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS nodes_ad AFTER DELETE ON nodes BEGIN
    INSERT INTO nodes_fts(nodes_fts, rowid, title, content, tags)
    VALUES ('delete', old.id, old.title, old.content, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS nodes_au AFTER UPDATE ON nodes BEGIN
    INSERT INTO nodes_fts(nodes_fts, rowid, title, content, tags)
    VALUES ('delete', old.id, old.title, old.content, old.tags);
    INSERT INTO nodes_fts(rowid, title, content, tags)
    VALUES (new.id, new.title, new.content, new.tags);
END;
"""


class MemoryStore:
    def __init__(self, db_path: str) -> None:
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA foreign_keys=ON")
        self._init_schema()

    def _init_schema(self) -> None:
        self.conn.executescript(SCHEMA)
        self.conn.commit()

    def close(self) -> None:
        self.conn.close()

    # --- Nodes ---

    def add_node(self, node: Node) -> int:
        now = datetime.now().isoformat()
        cur = self.conn.execute(
            """INSERT INTO nodes (type, title, content, tags, metadata, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                node.type.value,
                node.title,
                node.content,
                json.dumps(node.tags),
                json.dumps(node.metadata),
                now,
                now,
            ),
        )
        self.conn.commit()
        return cur.lastrowid  # type: ignore[return-value]

    def get_node(self, node_id: int) -> Optional[Node]:
        row = self.conn.execute(
            "SELECT * FROM nodes WHERE id = ?", (node_id,)
        ).fetchone()
        if row is None:
            return None
        return self._row_to_node(row)

    def update_node(self, node_id: int, **kwargs: object) -> None:
        if "tags" in kwargs and isinstance(kwargs["tags"], list):
            kwargs["tags"] = json.dumps(kwargs["tags"])
        if "metadata" in kwargs and isinstance(kwargs["metadata"], dict):
            kwargs["metadata"] = json.dumps(kwargs["metadata"])
        kwargs["updated_at"] = datetime.now().isoformat()
        sets = ", ".join(f"{k}=?" for k in kwargs)
        vals = list(kwargs.values()) + [node_id]
        self.conn.execute(f"UPDATE nodes SET {sets} WHERE id=?", vals)
        self.conn.commit()

    def delete_node(self, node_id: int) -> bool:
        cur = self.conn.execute("DELETE FROM nodes WHERE id = ?", (node_id,))
        self.conn.commit()
        return cur.rowcount > 0

    def get_nodes_by_type(self, node_type: NodeType) -> list[Node]:
        rows = self.conn.execute(
            "SELECT * FROM nodes WHERE type = ? ORDER BY updated_at DESC",
            (node_type.value,),
        ).fetchall()
        return [self._row_to_node(r) for r in rows]

    def get_all_nodes(self) -> list[Node]:
        rows = self.conn.execute(
            "SELECT * FROM nodes ORDER BY updated_at DESC"
        ).fetchall()
        return [self._row_to_node(r) for r in rows]

    def search_nodes(self, query: str) -> list[Node]:
        rows = self.conn.execute(
            """SELECT n.* FROM nodes n
               JOIN nodes_fts f ON n.id = f.rowid
               WHERE nodes_fts MATCH ?
               ORDER BY rank""",
            (query,),
        ).fetchall()
        return [self._row_to_node(r) for r in rows]

    def get_nodes_by_tag(self, tag: str) -> list[Node]:
        rows = self.conn.execute(
            "SELECT * FROM nodes WHERE tags LIKE ? ORDER BY updated_at DESC",
            (f'%"{tag}"%',),
        ).fetchall()
        return [self._row_to_node(r) for r in rows]

    # --- Edges ---

    def add_edge(self, edge: Edge) -> int:
        cur = self.conn.execute(
            """INSERT INTO edges (source_id, target_id, relationship, label, metadata)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(source_id, target_id, relationship) DO UPDATE SET
               label=excluded.label, metadata=excluded.metadata""",
            (
                edge.source_id,
                edge.target_id,
                edge.relationship.value,
                edge.label,
                json.dumps(edge.metadata),
            ),
        )
        self.conn.commit()
        return cur.lastrowid  # type: ignore[return-value]

    def get_edges_from(self, node_id: int) -> list[dict]:
        rows = self.conn.execute(
            """SELECT e.*, n.title as target_title, n.type as target_type
               FROM edges e
               JOIN nodes n ON e.target_id = n.id
               WHERE e.source_id = ?
               ORDER BY e.relationship""",
            (node_id,),
        ).fetchall()
        return [dict(r) for r in rows]

    def get_edges_to(self, node_id: int) -> list[dict]:
        rows = self.conn.execute(
            """SELECT e.*, n.title as source_title, n.type as source_type
               FROM edges e
               JOIN nodes n ON e.source_id = n.id
               WHERE e.target_id = ?
               ORDER BY e.relationship""",
            (node_id,),
        ).fetchall()
        return [dict(r) for r in rows]

    def get_neighbors(self, node_id: int) -> list[Node]:
        rows = self.conn.execute(
            """SELECT DISTINCT n.* FROM nodes n
               WHERE n.id IN (
                   SELECT target_id FROM edges WHERE source_id = ?
                   UNION
                   SELECT source_id FROM edges WHERE target_id = ?
               )
               ORDER BY n.updated_at DESC""",
            (node_id, node_id),
        ).fetchall()
        return [self._row_to_node(r) for r in rows]

    def delete_edge(self, source_id: int, target_id: int, relationship: str) -> bool:
        cur = self.conn.execute(
            "DELETE FROM edges WHERE source_id = ? AND target_id = ? AND relationship = ?",
            (source_id, target_id, relationship),
        )
        self.conn.commit()
        return cur.rowcount > 0

    # --- Stats ---

    def get_stats(self) -> dict:
        node_counts = self.conn.execute(
            "SELECT type, COUNT(*) as cnt FROM nodes GROUP BY type"
        ).fetchall()
        edge_counts = self.conn.execute(
            "SELECT relationship, COUNT(*) as cnt FROM edges GROUP BY relationship"
        ).fetchall()
        total_nodes = self.conn.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]
        total_edges = self.conn.execute("SELECT COUNT(*) FROM edges").fetchone()[0]
        return {
            "total_nodes": total_nodes,
            "total_edges": total_edges,
            "nodes_by_type": {r["type"]: r["cnt"] for r in node_counts},
            "edges_by_type": {r["relationship"]: r["cnt"] for r in edge_counts},
        }

    # --- Helpers ---

    @staticmethod
    def _row_to_node(row: sqlite3.Row) -> Node:
        return Node(
            id=row["id"],
            type=row["type"],
            title=row["title"],
            content=row["content"],
            tags=json.loads(row["tags"] or "[]"),
            metadata=json.loads(row["metadata"] or "{}"),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
