package com.udd.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier

// Status/review/comments companion — NO code editor, NO terminal
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                Surface(modifier = Modifier.fillMaxSize()) {
                    CompanionApp()
                }
            }
        }
    }
}

@Composable
fun CompanionApp() {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Home", "Projects", "Activity", "Settings")

    Scaffold(
        bottomBar = {
            NavigationBar {
                tabs.forEachIndexed { index, label ->
                    NavigationBarItem(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        icon = { Icon(Icons.Default.Home, contentDescription = label) },
                        label = { Text(label) }
                    )
                }
            }
        }
    ) { _ ->
        when (selectedTab) {
            0 -> HomeScreen()
            1 -> ProjectsScreen()
            2 -> ActivityScreen()
            3 -> SettingsScreen()
        }
    }
}

@Composable fun HomeScreen() { Text("Home — recent projects, active sessions, recent runs") }
@Composable fun ProjectsScreen() { Text("Projects") }
@Composable fun ActivityScreen() { Text("Activity — pipeline runs, comments") }
@Composable fun SettingsScreen() { Text("Settings") }
