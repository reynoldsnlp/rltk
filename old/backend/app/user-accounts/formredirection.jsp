<?xml version="1.0" encoding="UTF-8"?>
<%@page contentType="text/html; charset=UTF-8"
	import="java.util.Map,java.util.Set"%>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<title>OpenID Redirection</title>
<meta http-equiv="Content-Type"
	content="application/xhtml+xml; charset=UTF-8" />
<link type="text/css" href="/VIEW/view.css" rel="stylesheet" />
</head>
<body onload="document.getElementById('openid-form-redirection').submit()">
	<div id="wrapper">
		<div id="main">
			<div id="mainpartwrapper">
				<div id="mainpart">
					<form id="openid-form-redirection"
						action='<%=request.getAttribute("OPEndpoint")%>' method="post"
						accept-charset="utf-8">
						<p>
							<%
								@SuppressWarnings("unchecked")
								Map<String, String> parameterMap = (Map<String, String>) request
										.getAttribute("parameterMap");
								for (String key : ((Set<String>) parameterMap.keySet())) {
									String value = parameterMap.get(key);
							%>
							<input type="hidden" name='<%=key%>' value='<%=value%>' />
							<%
								}
							%>
						</p>
						<p>
							<input type="submit" value="Click here" />&nbsp; if you are not
							automatically redirected.
						</p>
					</form>
				</div>
			</div>
		</div>
	</div>
</body>
</html>
