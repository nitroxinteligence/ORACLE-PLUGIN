"""Windows presentation and synchronized Codex compatibility overlay."""
import copy


def windows_plugin_metadata(portable):
    root = copy.deepcopy(portable)
    interface = root['extensions']['com.openai']['interface']
    interface['longDescription'] = interface['longDescription'].replace(
        'Oracle para macOS Apple Silicon', 'Oracle para Windows x64')
    legacy = {key: copy.deepcopy(root[key]) for key in ('name', 'version', 'description', 'author')}
    legacy.update(interface=copy.deepcopy(interface), mcpServers='./.mcp.json')
    return root, legacy
