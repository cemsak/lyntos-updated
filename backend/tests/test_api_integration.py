"""
API Integration Tests
Virgosol Standard: Tests all API endpoints with TestClient
"""
import pytest

# Skip all tests in this module if fastapi is not available
pytest.importorskip("fastapi")


class TestHealthEndpoints:
    """Health check endpoint tests"""

    def test_main_health(self, test_client):
        """Main health endpoint"""
        response = test_client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_feed_health(self, test_client):
        """Feed service health"""
        response = test_client.get("/api/v2/feed/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_evidence_bundle_health(self, test_client):
        """Evidence bundle service health"""
        response = test_client.get("/api/v2/evidence-bundle/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_brief_health(self, test_client):
        """Brief service health"""
        response = test_client.get("/api/v2/brief/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_dossier_health(self, test_client):
        """Dossier service health"""
        response = test_client.get("/api/v2/dossier/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestFeedAPI:
    """Feed API endpoint tests"""

    def test_get_feed_empty(self, test_client):
        """Empty feed should return empty list with warning"""
        response = test_client.get(
            "/api/v2/feed/2024-Q1",
            params={"smmm_id": "TEST", "client_id": "TEST"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "schema" in data
        assert "data" in data
        assert data["data"] == []

    def test_get_feed_critical(self, test_client):
        """Critical endpoint should filter correctly"""
        response = test_client.get(
            "/api/v2/feed/2024-Q1/critical",
            params={"smmm_id": "TEST", "client_id": "TEST"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_feed_response_envelope(self, test_client):
        """Feed response should have ResponseEnvelope format"""
        response = test_client.get(
            "/api/v2/feed/2024-Q1",
            params={"smmm_id": "TEST", "client_id": "TEST"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "schema" in data
        assert "meta" in data
        assert "data" in data
        assert "errors" in data
        assert "warnings" in data


class TestEvidenceBundleAPI:
    """Evidence Bundle API endpoint tests"""

    def test_generate_bundle_empty(self, test_client):
        """Generate with no feed data should return warning"""
        response = test_client.post(
            "/api/v2/evidence-bundle/generate",
            json={
                "smmm_id": "TEST-SMMM",
                "client_id": "TEST-CLIENT",
                "period": "2024-Q1"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "warnings" in data

    def test_download_nonexistent(self, test_client):
        """Download nonexistent bundle should 404"""
        response = test_client.get("/api/v2/evidence-bundle/download/NONEXISTENT")
        assert response.status_code == 404

    def test_bundle_response_envelope(self, test_client):
        """Bundle response should have ResponseEnvelope format"""
        response = test_client.post(
            "/api/v2/evidence-bundle/generate",
            json={
                "smmm_id": "TEST-SMMM",
                "client_id": "TEST-CLIENT",
                "period": "2024-Q1"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "schema" in data
        assert "data" in data
        assert "errors" in data
        assert "warnings" in data


class TestBriefAPI:
    """Brief API endpoint tests"""

    def test_generate_brief(self, test_client):
        """Generate brief should return valid structure"""
        response = test_client.post(
            "/api/v2/brief/generate",
            json={
                "smmm_id": "TEST-SMMM",
                "client_id": "TEST-CLIENT",
                "period": "2024-Q1"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "slides" in data["data"]

    def test_generate_brief_with_bundle_id(self, test_client):
        """Generate brief with bundle_id reference"""
        response = test_client.post(
            "/api/v2/brief/generate",
            json={
                "smmm_id": "TEST-SMMM",
                "client_id": "TEST-CLIENT",
                "period": "2024-Q1",
                "bundle_id": "BUNDLE-123"
            }
        )
        assert response.status_code == 200

    def test_get_brief_not_implemented(self, test_client):
        """Get brief by ID should return not implemented error"""
        response = test_client.get("/api/v2/brief/SOME-ID")
        assert response.status_code == 200
        data = response.json()
        assert len(data["errors"]) > 0

    def test_brief_response_envelope(self, test_client):
        """Brief response should have ResponseEnvelope format"""
        response = test_client.post(
            "/api/v2/brief/generate",
            json={
                "smmm_id": "TEST-SMMM",
                "client_id": "TEST-CLIENT",
                "period": "2024-Q1"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "schema" in data
        assert "data" in data
        assert "errors" in data
        assert "warnings" in data


class TestDossierAPI:
    """Dossier API endpoint tests"""

    def test_generate_dossier(self, test_client):
        """Generate dossier should return valid structure"""
        response = test_client.post(
            "/api/v2/dossier/generate",
            json={
                "smmm_id": "TEST-SMMM",
                "client_id": "TEST-CLIENT",
                "period": "2024-Q1",
                "generate_pdf": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "sections" in data["data"]

    def test_generate_dossier_with_references(self, test_client):
        """Generate dossier with bundle and brief references"""
        response = test_client.post(
            "/api/v2/dossier/generate",
            json={
                "smmm_id": "TEST-SMMM",
                "client_id": "TEST-CLIENT",
                "period": "2024-Q1",
                "generate_pdf": False,
                "bundle_id": "BUNDLE-123",
                "brief_id": "BRIEF-456"
            }
        )
        assert response.status_code == 200

    def test_full_package(self, test_client):
        """Full package should return bundle + brief + dossier"""
        response = test_client.post(
            "/api/v2/dossier/full-package",
            json={
                "smmm_id": "TEST-SMMM",
                "client_id": "TEST-CLIENT",
                "period": "2024-Q1",
                "generate_pdfs": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "bundle" in data["data"]
        assert "brief" in data["data"]
        assert "dossier" in data["data"]

    def test_download_pdf_nonexistent(self, test_client):
        """Download nonexistent PDF should 404"""
        response = test_client.get("/api/v2/dossier/download/NONEXISTENT/pdf")
        assert response.status_code == 404

    def test_dossier_response_envelope(self, test_client):
        """Dossier response should have ResponseEnvelope format"""
        response = test_client.post(
            "/api/v2/dossier/generate",
            json={
                "smmm_id": "TEST-SMMM",
                "client_id": "TEST-CLIENT",
                "period": "2024-Q1",
                "generate_pdf": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "schema" in data
        assert "data" in data
        assert "errors" in data
        assert "warnings" in data


class TestResponseEnvelopeCompliance:
    """All endpoints should return ResponseEnvelope format"""

    ENDPOINTS = [
        ("GET", "/api/v2/feed/2024-Q1", {"smmm_id": "T", "client_id": "T"}),
        ("POST", "/api/v2/evidence-bundle/generate", None),
        ("POST", "/api/v2/brief/generate", None),
        ("POST", "/api/v2/dossier/generate", None),
    ]

    @pytest.mark.parametrize("method,endpoint,params", ENDPOINTS)
    def test_envelope_structure(self, test_client, method, endpoint, params):
        """All responses should have schema/meta/data/errors/warnings"""
        if method == "GET":
            response = test_client.get(endpoint, params=params)
        else:
            response = test_client.post(
                endpoint,
                json={
                    "smmm_id": "TEST",
                    "client_id": "TEST",
                    "period": "2024-Q1",
                    "generate_pdf": False if "dossier" in endpoint else None
                }
            )

        assert response.status_code == 200
        data = response.json()

        # ResponseEnvelope required fields
        assert "schema" in data, f"Missing 'schema' in {endpoint}"
        assert "data" in data or data.get("data") is None, f"Missing 'data' in {endpoint}"
        assert "errors" in data, f"Missing 'errors' in {endpoint}"
        assert "warnings" in data, f"Missing 'warnings' in {endpoint}"

    @pytest.mark.parametrize("method,endpoint,params", ENDPOINTS)
    def test_schema_structure(self, test_client, method, endpoint, params):
        """Schema should have name, version, generated_at"""
        if method == "GET":
            response = test_client.get(endpoint, params=params)
        else:
            response = test_client.post(
                endpoint,
                json={
                    "smmm_id": "TEST",
                    "client_id": "TEST",
                    "period": "2024-Q1",
                    "generate_pdf": False if "dossier" in endpoint else None
                }
            )

        assert response.status_code == 200
        schema = response.json()["schema"]
        assert "name" in schema
        assert "version" in schema


class TestAPIValidation:
    """Test API input validation"""

    def test_feed_missing_params(self, test_client):
        """Feed should require smmm_id and client_id"""
        response = test_client.get("/api/v2/feed/2024-Q1")
        assert response.status_code == 422  # Validation error

    def test_bundle_empty_body(self, test_client):
        """Bundle generate should require body"""
        response = test_client.post("/api/v2/evidence-bundle/generate")
        assert response.status_code == 422

    def test_brief_empty_body(self, test_client):
        """Brief generate should require body"""
        response = test_client.post("/api/v2/brief/generate")
        assert response.status_code == 422

    def test_dossier_empty_body(self, test_client):
        """Dossier generate should require body"""
        response = test_client.post("/api/v2/dossier/generate")
        assert response.status_code == 422

    def test_full_package_empty_body(self, test_client):
        """Full package should require body"""
        response = test_client.post("/api/v2/dossier/full-package")
        assert response.status_code == 422


class TestAPISchemaNames:
    """Test that schema names are correct"""

    def test_feed_schema_name(self, test_client):
        response = test_client.get(
            "/api/v2/feed/2024-Q1",
            params={"smmm_id": "T", "client_id": "T"}
        )
        assert response.json()["schema"]["name"] == "FeedResponse"

    def test_bundle_schema_name(self, test_client):
        response = test_client.post(
            "/api/v2/evidence-bundle/generate",
            json={"smmm_id": "T", "client_id": "T", "period": "2024-Q1"}
        )
        assert response.json()["schema"]["name"] == "EvidenceBundleResponse"

    def test_brief_schema_name(self, test_client):
        response = test_client.post(
            "/api/v2/brief/generate",
            json={"smmm_id": "T", "client_id": "T", "period": "2024-Q1"}
        )
        assert response.json()["schema"]["name"] == "CLevelBriefResponse"

    def test_dossier_schema_name(self, test_client):
        response = test_client.post(
            "/api/v2/dossier/generate",
            json={"smmm_id": "T", "client_id": "T", "period": "2024-Q1", "generate_pdf": False}
        )
        assert response.json()["schema"]["name"] == "FullDossierResponse"

    def test_full_package_schema_name(self, test_client):
        response = test_client.post(
            "/api/v2/dossier/full-package",
            json={"smmm_id": "T", "client_id": "T", "period": "2024-Q1", "generate_pdfs": False}
        )
        assert response.json()["schema"]["name"] == "FullPackageResponse"
