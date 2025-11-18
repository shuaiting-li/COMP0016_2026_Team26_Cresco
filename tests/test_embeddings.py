from types import SimpleNamespace

from agritech_core.rag import _extract_embedding_values


def test_extract_embedding_values_from_dict():
    data = {"embedding": {"values": [1.0, 0.5, -0.25]}}
    assert _extract_embedding_values(data) == [1.0, 0.5, -0.25]


def test_extract_embedding_values_from_namespace():
    payload = SimpleNamespace(embedding=SimpleNamespace(values=[0.1, 0.2]))
    assert _extract_embedding_values(payload) == [0.1, 0.2]
