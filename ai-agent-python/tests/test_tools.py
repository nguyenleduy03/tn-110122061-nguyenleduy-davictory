from tools.tools_library import QueryDatabase, GetCenterStats, GetUsersList


class TestToolsModule:
    def test_query_database_tool_exists(self):
        tool = QueryDatabase()
        assert tool.name is not None
        assert tool.description is not None

    def test_get_center_stats_tool_exists(self):
        tool = GetCenterStats()
        assert tool.name is not None
        assert tool.description is not None

    def test_get_users_list_tool_exists(self):
        tool = GetUsersList()
        assert tool.name is not None
        assert tool.description is not None
