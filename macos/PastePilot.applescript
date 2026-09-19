-- PastePilot Quick Action / Services script
-- Receives selected text from macOS Services or Automator.
-- Opens the local PastePilot app URL. Does not watch the clipboard.

on encodeText(theText)
	return do shell script "/usr/bin/python3 -c \"import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))\" " & quoted form of theText
end encodeText

on run {input, parameters}
	set theText to ""
	try
		set theText to input as text
	end try
	if theText is "" then
		display notification "Select text first, then choose PastePilot." with title "PastePilot"
		return input
	end if
	set dest to "http://localhost:5173/?text=" & encodeText(theText)
	open location dest
	return input
end run
