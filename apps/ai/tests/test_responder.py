from src.engine.responder import get_response, get_suggested_questions


def test_get_response_universitas():
    resp = get_response("cari universitas")
    assert "408" in resp
    assert "perguruan tinggi" in resp


def test_get_response_program_studi():
    resp = get_response("program studi")
    assert "18.881" in resp


def test_get_response_passing_grade():
    resp = get_response("passing grade")
    assert "Passing Grade" in resp or "passing grade" in resp


def test_get_response_beasiswa():
    resp = get_response("info beasiswa")
    assert "Beasiswa" in resp


def test_get_response_mentoring():
    resp = get_response("program mentoring")
    assert "mentoring" in resp


def test_get_response_greeting():
    resp = get_response("halo")
    assert "MULAI+" in resp


def test_get_response_unknown():
    resp = get_response("xyz123unknown")
    assert "Maaf" in resp


def test_get_suggested_questions():
    questions = get_suggested_questions()
    assert len(questions) == 4
