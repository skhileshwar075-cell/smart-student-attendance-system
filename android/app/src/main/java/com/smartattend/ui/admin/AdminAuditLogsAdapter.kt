package com.smartattend.ui.admin

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.smartattend.R
import com.smartattend.domain.model.AuditLog

class AdminAuditLogsAdapter : ListAdapter<AuditLog, AdminAuditLogsAdapter.VH>(DIFF) {

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvAction: TextView = view.findViewById(R.id.tvAction)
        val tvActor: TextView = view.findViewById(R.id.tvActor)
        val tvTimestamp: TextView = view.findViewById(R.id.tvTimestamp)
        val tvDetails: TextView = view.findViewById(R.id.tvDetails)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_audit_log, parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = getItem(position)
        holder.tvAction.text = item.action ?: "—"
        holder.tvActor.text = item.userName?.let { "By: $it" } ?: "System"
        holder.tvTimestamp.text = item.createdAt ?: ""
        holder.tvDetails.text = when (val d = item.details) {
            is String -> d
            is Map<*, *> -> d.entries.joinToString(", ") { "${it.key}: ${it.value}" }
            null -> ""
            else -> d.toString()
        }
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<AuditLog>() {
            override fun areItemsTheSame(a: AuditLog, b: AuditLog) = a.id == b.id
            override fun areContentsTheSame(a: AuditLog, b: AuditLog) = a == b
        }
    }
}
